# FastLane Task Manager Interface Documentation

## Overview

The **Task Manager** is a decentralized system designed to schedule and execute smart contract tasks on-chain. Its primary goals are to:

- **Record Tasks Securely:** When tasks are scheduled, they are recorded along with essential metadata such as the owner's address, a unique nonce, and task-specific parameters
- **Execute Tasks Reliably:** Tasks are executed in dedicated, isolated environments to ensure safety and gas efficiency
- **Provide Economic Security:** The system uses a bonding mechanism via shMONAD tokens to secure tasks against malicious behavior
- **Optimize Load:** A load balancing mechanism dynamically distributes tasks across blocks, taking into account network conditions and historical execution metrics

## Core Concepts

### Scheduling vs. Execution

#### Scheduling
- **Task Recording:** When a task is scheduled, all necessary details (owner, nonce, task size, target address, and encoded call data) are recorded in the system
- **Bonding Requirement:** Scheduling a task requires bonding shMONAD tokens to secure the task. The required bond is dynamically calculated based on task size and network conditions

#### Execution
- **Execution Timing:** Tasks are executed at the earliest possible opportunity — at least one block after scheduling
- **Isolation:** Each task executes in its own isolated environment
- **Gas Categories:**
  - Small Tasks: <= 100,000 gas
  - Medium Tasks: <= 250,000 gas
  - Large Tasks: <= 750,000 gas

### Task Encoding

Tasks must be properly encoded before scheduling:

```solidity
// 1. Encode the target function call
bytes memory targetCalldata = abi.encodeCall(MockTarget.setValue, (42));

// 2. Pack the target address with the encoded call data
bytes memory packedData = abi.encode(address(target), targetCalldata);

// 3. Encode for the execution environment
bytes memory taskData = abi.encodeWithSelector(
    ITaskExecutionEnvironment.executeTask.selector,
    packedData
);
```

## Basic Usage

### Scheduling a Task

```solidity
// Schedule the task
(bool scheduled, uint256 executionCost, bytes32 taskId) = taskManager.scheduleTask(
    executionEnvironmentAddress,  // Environment address
    100_000,                     // Gas limit
    uint64(block.number + 2),    // Target block
    type(uint256).max / 2,       // Maximum payment
    taskData                     // Encoded task data
);
```

### Executing Tasks

```solidity
// Execute pending tasks
uint256 feesEarned = taskManager.executeTasks(payoutAddress, 0);

// Verify execution
bool executed = taskManager.isTaskExecuted(taskId);
```

## Advanced Features

For detailed information about:
- Custom execution environments
- Rescheduling and retry logic
- Task cancellation and authorization
- Economic security and fee calculations

For implementation details and test examples, see the [examples/README.md](./examples/README.md) documentation.

## Core Interfaces

The system is built around two primary interfaces:

### ITaskManager
[View Source](./examples/interfaces/ITaskManager.sol)
```solidity
interface ITaskManager {
    function scheduleTask(
        address implementation,
        uint256 taskGasLimit,
        uint64 targetBlock,
        uint256 maxPayment,
        bytes calldata taskCallData
    ) external payable returns (bool scheduled, uint256 executionCost, bytes32 taskId);
    
    // ... other core scheduling and management functions
}
```

### ITaskExecutionEnvironment
[View Source](./examples/interfaces/IExecutionEnvironment.sol)
```solidity
interface ITaskExecutionEnvironment {
    function executeTask(bytes calldata taskData) external returns (bool success);
}
```

For complete interface definitions and types, see:
- [ITaskManager.sol](./examples/interfaces/ITaskManager.sol) - Core task management interface
- [IExecutionEnvironment.sol](./examples/interfaces/IExecutionEnvironment.sol) - Task execution interface
- [TaskTypes.sol](./examples/interfaces/TaskTypes.sol) - Shared types and structures