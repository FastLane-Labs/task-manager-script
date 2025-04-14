# Task Manager Advanced Features & Examples

This directory contains detailed documentation and example implementations for advanced Task Manager features. While the root README covers basic usage, here we explore:

- Custom execution environments
- Advanced task management
- Security and authorization patterns
- Economic models and fee handling

## Task Execution Environments

The Task Execution Environment provides an isolated execution context for tasks. When a task is scheduled, the Task Manager deploys a minimal, task-specific proxy contract that delegates execution to your environment implementation.

### How Environments Work

1. **Proxy Deployment**: When scheduling a task, the Task Manager deploys a task-specific proxy contract
2. **Delegation Pattern**: During execution, the proxy `delegatecall`s the `executeTask` function on your implementation
3. **Isolated Context**: Each task executes in its own proxy context for enhanced security and isolation

### Available Environments

#### BasicTaskEnvironment

Location: `BasicTaskEnvironment.sol`

A helper environment that provides pre-execution validation and execution logging. Features:
- Input validation (non-zero address, non-empty calldata)
- Detailed event emission
- Error propagation from failed calls
- Task isolation

Example implementation:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BasicTaskEnvironment {
    // Address of the TaskManager contract
    address public immutable TASK_MANAGER;

    event TaskExecuted(address indexed target, bytes data, bool success);

    constructor(address taskManager_) {
        TASK_MANAGER = taskManager_;
    }

    // Optional modifier: Restricts calls to only the TaskManager
    modifier onlyTaskManager() {
        require(msg.sender == TASK_MANAGER, "Only TaskManager");
        _;
    }

    /**
     * @notice Executes a task by decoding target and calldata, then calling the target
     * @param taskData Abi-encoded tuple (address target, bytes memory data)
     * @return success True if the call to the target succeeded
     */
    function executeTask(bytes calldata taskData)
        external
        onlyTaskManager
        returns (bool success)
    {
        // Decode the target address and calldata
        (address target, bytes memory data) = abi.decode(
            taskData,
            (address, bytes)
        );

        // Execute the task by calling the target
        (success, ) = target.call(data);

        emit TaskExecuted(target, data, success);

        return success;
    }
}
```

#### ReschedulingTaskEnvironment

Location: `ReschedulingTaskEnvironment.sol`

A task environment that implements automatic retry logic for failed tasks. Features:

- Maximum of 3 retry attempts
- 5 block delay between retries
- Event emission for execution tracking
- Built-in input validation

Implementation example:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ITaskManager } from "./interfaces/ITaskManager.sol";

contract ReschedulingTaskEnvironment {
    // Maximum number of retry attempts
    uint8 constant MAX_RETRIES = 3;
    
    // Block delay between retry attempts
    uint64 constant RETRY_DELAY = 5;
    
    // Address of the TaskManager contract
    address public immutable TASK_MANAGER;

    // Events for tracking execution
    event TaskStarted(address target, bytes data);
    event TaskCompleted(address target, bool success);
    event TaskRescheduled(address target, uint64 newTargetBlock);
    event ExecutionAttempt(uint8 attemptNumber, bool success);

    constructor(address taskManager_) {
        TASK_MANAGER = taskManager_;
    }

    modifier onlyTaskManager() {
        require(msg.sender == TASK_MANAGER, "Only TaskManager");
        _;
    }

    /**
     * @notice Executes a task with automatic retry logic for failed attempts
     * @param taskData Abi-encoded tuple (address target, bytes memory data, uint8 attemptNumber)
     * @return success True if execution succeeded or was rescheduled
     */
    function executeTask(bytes calldata taskData)
        external
        onlyTaskManager
        returns (bool success)
    {
        // Decode including the attempt number (or default to 1)
        (address target, bytes memory data, uint8 attemptNumber) = 
            taskData.length > 64 ? 
            abi.decode(taskData, (address, bytes, uint8)) : 
            (abi.decode(taskData, (address, bytes)), 1);
            
        require(attemptNumber <= MAX_RETRIES, "Max retries exceeded");
        
        emit TaskStarted(target, data);
        emit ExecutionAttempt(attemptNumber, false);

        // Execute the task
        (success, ) = target.call(data);
        
        // If execution failed and we haven't reached MAX_RETRIES, reschedule
        if (!success && attemptNumber < MAX_RETRIES) {
            uint64 newTargetBlock = uint64(block.number) + RETRY_DELAY;
            
            // Package data with incremented attempt number
            bytes memory newTaskData = abi.encode(
                target, 
                data,
                attemptNumber + 1
            );
            
            // Reschedule using bonded shMONAD (note: requires sufficient bond)
            // This will be a new task with the same implementation
            (bool rescheduled, , ) = ITaskManager(TASK_MANAGER).rescheduleTask(
                newTargetBlock,
                0.01 ether // Example max payment
            );
            
            if (rescheduled) {
                emit TaskRescheduled(target, newTargetBlock);
                return true; // Consider rescheduling a success
            }
        }
        
        emit TaskCompleted(target, success);
        return success;
    }
}
```

Usage example:
```solidity
// Deploy the environment
ReschedulingTaskEnvironment env = new ReschedulingTaskEnvironment(taskManagerAddress);

// Schedule a task using this environment
taskManager.scheduleTask(
    address(env),    // Use the rescheduling environment
    100_000,        // Gas limit
    targetBlock,    // Target block
    maxPayment,     // Max payment
    taskData        // Encoded task data
);
```

## Advanced Topics

### Rescheduling Tasks

The Task Manager supports task rescheduling using the `rescheduleTask` function, which can be called from within the task execution environment:

```solidity
function rescheduleTask(
    uint64 targetBlock,
    uint256 maxPayment
) external payable returns (bool rescheduled, uint256 executionCost, bytes32 taskId);
```

This feature improves reliability without requiring manual intervention.

#### How Rescheduling Works

- **Within Execution Context**: The environment's `executeTask` function calls `taskManager.rescheduleTask()`
- **Same Implementation**: The rescheduled task uses the same implementation contract
- **Automatic Cancellation**: The current task is marked as executed and a new task is scheduled
- **Bond Requirement**: Rescheduling requires sufficient bonded shMONAD (not direct MON payment)

:::important
**Rescheduling only works with bonded shMONAD** (not with direct MON payments) because contracts can't typically hold or transfer native MON. Ensure the task owner has sufficient bonded shMONAD before implementing recurring tasks.
:::

### Task Cancellation and Authorization

The Task Manager provides flexible authorization mechanisms that allow task owners to delegate control over their tasks:

#### Task-Level Authorization

Individual tasks can have multiple authorized cancellers:

```solidity
// As the task owner
function setupTaskCanceller(bytes32 taskId, address canceller) external {
    // Add authorization for a specific task
    taskManager.addTaskCanceller(taskId, canceller);
}

// As the authorized canceller
function cancelSpecificTask(bytes32 taskId) external {
    // This will only succeed if msg.sender is an authorized canceller
    taskManager.cancelTask(taskId);
}

// As the task owner, remove authorization
function removeTaskCanceller(bytes32 taskId, address canceller) external {
    taskManager.removeTaskCanceller(taskId, canceller);
}
```

#### Environment-Level Authorization

For more granular control, you can authorize cancellers at the environment level:

```solidity
// As the environment owner
function setupEnvironmentCanceller(bytes32 taskId, address canceller) external {
    // Add authorization for all tasks in this environment
    taskManager.addEnvironmentCanceller(taskId, canceller);
}

// As the authorized environment canceller
function cancelEnvironmentTask(bytes32 taskId) external {
    // This will succeed for any task in the authorized environment
    taskManager.cancelTask(taskId);
}

// As the environment owner, remove authorization
function removeEnvironmentCanceller(bytes32 taskId, address canceller) external {
    taskManager.removeEnvironmentCanceller(taskId, canceller);
}
```

#### Authorization Hierarchy

The system implements a hierarchical authorization model:
1. Task Owner: Has full control over the task
2. Environment Cancellers: Can cancel any task in their authorized environment
3. Task Cancellers: Can only cancel specific authorized tasks
4. Others: No cancellation rights

### Economic Security & Fee Calculations

The system employs a dynamic fee model for fair compensation and economic security through bonding.

#### Example: Estimating and Handling Fees

```solidity
// Estimate the cost of executing a task before scheduling
uint256 estimatedCost = taskManager.estimateCost(targetBlock, 100_000);
require(estimatedCost > 0, "Estimated cost must be positive");

// After task execution, fees are automatically distributed
uint256 feesEarned = taskManager.executeTasks(payoutAddress, 0);
require(feesEarned > 0, "Execution should earn fees");
```

## Execution Environment Architecture

### Security Model

The security of Execution Environments is enforced at two levels:

1. **Proxy-Level Enforcement** (Primary Security):
   - The Task Manager uses a specialized proxy pattern to interact with environment implementations
   - Only the `executeTask` function can be called through this proxy
   - All other function calls are blocked at the proxy level
   - This makes the `onlyTaskManager` modifier optional, as security is enforced by the proxy

2. **Environment-Level Controls** (Additional Safety):
   - Environments can implement additional security measures
   - Input validation
   - Custom access controls
   - Execution flow restrictions

Key security features:
1. **Airgapped Execution**: Tasks execute in isolated environments to prevent cross-task interference
2. **Proxy Protection**: The proxy pattern ensures only `executeTask` can be called, and only by the Task Manager
3. **Customizable Security**: Each environment can add its own security measures while maintaining core protections
4. **No State Dependencies**: Environments should be stateless between executions

### Minimal Secure Environment

Here's an example of a minimal secure environment that relies on proxy-level protection:

```solidity
contract MinimalExecutionEnvironment {
    function executeTask(bytes calldata taskData) external returns (bool) {
        (address target, bytes memory data) = abi.decode(taskData, (address, bytes));
        (bool success,) = target.call(data);
        return success;
    }
}
```

### Deployment Model

Anyone can deploy their own Execution Environment:

```solidity
// Deploy a custom environment
MyExecutionEnvironment myEE = new MyExecutionEnvironment(taskManagerAddress);

// Use it when scheduling tasks
taskManager.scheduleTask(
    address(myEE),  // Your custom environment
    gasLimit,
    targetBlock,
    maxPayment,
    taskData
);
```

### State Management Architecture

For tasks that need to maintain state across executions (like recurring tasks with configurable intervals):

```
┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
│                   │      │                   │      │                   │
│  Task Proxy #1    │──┐   │  Task Proxy #2    │──┐   │  Task Proxy #3    │──┐
│ (Task Execution)  │  │   │ (Task Execution)  │  │   │ (Task Execution)  │  │
│                   │  │   │                   │  │   │                   │  │
└───────────────────┘  │   └───────────────────┘  │   └───────────────────┘  │
                       │                          │                          │
                       │                          │                          │
                       ▼                          ▼                          ▼
                  ┌───────────────────────────────────────────────────────────┐
                  │                                                           │
                  │         External State Contract (Shared Storage)          │
                  │                                                           │
                  └───────────────────────────────────────────────────────────┘
```

This pattern allows multiple task executions to read from and write to the same state, even though each execution runs in an isolated proxy context.

### Best Practices

1. **Post-Execution Control**:
   - Instead of modifying the environment, implement control flow in your target contract
   - Example:
   ```solidity
   contract MyTarget {
       function executeWithPostChecks(uint256 value) external {
           // Perform the main task
           performTask(value);
           
           // Add post-execution logic here
           if (condition) {
               handleSuccess();
           } else {
               handleFailure();
           }
       }
   }
   ```

2. **Environment Selection**:
   - Use `BasicTaskEnvironment` for simple, direct execution
   - Use `ReschedulingTaskEnvironment` for automatic retry logic
   - Create custom environments for specific requirements

3. **Security Considerations**:
   - Environments should not store state between executions
   - Validate all inputs in `executeTask`
   - Emit events for important state changes
   - Consider gas implications of custom logic

## Creating Custom Environments

To create your own execution environment:

1. Inherit from a base environment (optional)
2. Implement the `executeTask` function
3. Add any custom logic for:
   - Pre/post execution hooks
   - Error handling
   - Event emission
   - State management

Example template:
```solidity
contract CustomTaskEnvironment {
    address public immutable TASK_MANAGER;

    constructor(address taskManager_) {
        TASK_MANAGER = taskManager_;
    }

    modifier onlyTaskManager() {
        require(msg.sender == TASK_MANAGER, "Only TaskManager");
        _;
    }

    function executeTask(bytes calldata taskData) 
        external 
        onlyTaskManager
        returns (bool)
    {
        // 1. Decode task data
        (address target, bytes memory data) = abi.decode(taskData, (address, bytes));

        // 2. Add custom pre-execution logic
        
        // 3. Execute the task
        (bool success,) = target.call(data);
        
        // 4. Add custom post-execution logic
        
        return success;
    }
}
``` 