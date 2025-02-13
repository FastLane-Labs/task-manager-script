# FastLane Task Manager Interface Documentation

## Overview

The **Task Manager** is a decentralized system designed to schedule and execute smart contract tasks on-chain. Its primary goals are to:

- **Record Tasks Securely:** When tasks are scheduled, they are recorded along with essential metadata such as the owner's address, a unique nonce, and task-specific parameters
- **Execute Tasks Reliably:** Tasks are executed in dedicated, isolated environments to ensure safety and gas efficiency
- **Provide Economic Security:** The system uses a bonding mechanism via shMONAD tokens to secure tasks against malicious behavior
- **Optimize Load:** A load balancing mechanism dynamically distributes tasks across blocks, taking into account network conditions and historical execution metrics

## Scheduling vs. Execution

### Scheduling

- **Task Recording:** When a task is scheduled, all necessary details (owner, nonce, task size, target address, and encoded call data) are recorded in the system
- **Bonding Requirement:** Scheduling a task requires bonding shMONAD tokens to secure the task. The required bond is dynamically calculated based on task size and network conditions

### Execution

- **Execution Timing:**
  - Tasks are designed to be executed at the earliest possible opportunity — at least one block after they are scheduled
  - Due to network conditions and block production variability, the exact execution block may be later than the intended target
- **Isolation:** Each task executes in its own isolated environment, ensuring that execution contexts do not interfere with one another
- **Gas Categories:**
  - Small Tasks: <= 100,000 gas
  - Medium Tasks: <= 250,000 gas
  - Large Tasks: <= 750,000 gas

## Task Encoding

Before a task is scheduled, it must be encoded into a standardized format so the task manager can process it correctly. The encoding involves three key layers:

1. **Target Function Call Encoding:**  
   Use Solidity's ABI encoding (e.g., `abi.encodeCall` or `abi.encodeWithSelector`) to encode the function call for the target contract.

2. **Packing the Execution Data:**  
   Combine the target contract's address with the encoded call data. This step produces a "packed" data blob that specifies both the destination and the intended action.

3. **Encoding for the Execution Environment:**  
   Wrap the packed data with the `executeTask` function selector (from the `ITaskExecutionEnvironment` interface) to create the final task data payload.

## Examples

### Example 1: Encoding a Task

```solidity
// Import the interface for the execution environment
import { ITaskExecutionEnvironment } from "path/to/ITaskExecutionEnvironment.sol";

// Step 1: Encode the target function call (e.g., setting a value to 42)
bytes memory targetCalldata = abi.encodeCall(MockTarget.setValue, (42));

// Step 2: Pack the target address with the encoded call data
bytes memory packedData = abi.encode(address(target), targetCalldata);

// Step 3: Encode the final task data using the executeTask selector
bytes memory taskData = abi.encodeWithSelector(
    ITaskExecutionEnvironment.executeTask.selector,
    packedData
);
```

### Example 2: Scheduling a Task

```solidity
// Assume the following variables are defined:
// - executionEnvironmentAddress: the address of the execution environment contract
// - taskManager: the deployed Task Manager contract
// - taskData: the encoded task data from the previous example
// - payoutAddress: the address to receive any execution fees

// Set the target block to ensure execution occurs at least one block later
uint64 targetBlock = uint64(block.number + 2);

// Schedule the task with a specified gas limit and maximum payment
(bool scheduled, uint256 executionCost, bytes32 taskId) = taskManager.scheduleTask(
    executionEnvironmentAddress,  // Execution environment address
    100_000,                     // Gas limit (should be <= predefined limits)
    targetBlock,                 // Target execution block
    type(uint256).max / 2,       // Maximum payment for execution
    taskData                     // Encoded task data
);

require(scheduled, "Task scheduling failed");
```

### Example 3: Executing a Task

```solidity
// Execute pending tasks. The payout address receives any execution fees
// The 'targetGasReserve' parameter reserves gas for post-execution operations
uint256 feesEarned = taskManager.executeTasks(payoutAddress, 0);

// Verify that the task has been executed
bool executed = taskManager.isTaskExecuted(taskId);
require(executed, "Task was not executed");
```

## Test Validity

The examples provided here are consistent with our internal tests. Key points verified in our tests include:

- **Execution Delay:** Tasks are scheduled with a target block at least two blocks ahead (e.g., block.number + 2)
- **Task Metadata Accuracy:** Tests verify correct recording and updating of task metadata
- **Cancellation & Authorization:** Only authorized addresses can cancel tasks
- **State Updates Post-Execution:** Tests confirm target contract state updates and task execution status

## Advanced Topics

### Rescheduling Tasks

The Task Manager supports task rescheduling using dedicated execution environments (such as the **ReschedulingTaskEnvironment**). This feature improves reliability without requiring manual intervention.

#### How Rescheduling Works

- **Automatic Retry:** When a task fails, the environment emits an event and schedules a retry after a defined delay
- **Retry Limit:** A maximum number of retries (e.g., `MAX_RETRIES = 3`) prevents infinite retry loops

#### Example: Rescheduling a Task

```solidity
// Assume that the ReschedulingTaskEnvironment is deployed
bytes memory targetCalldata = abi.encodeCall(MockTarget.setValue, (42));
bytes memory packedData = abi.encode(address(target), targetCalldata);
bytes memory taskData = abi.encodeWithSelector(
    ITaskExecutionEnvironment.executeTask.selector,
    packedData
);

// Schedule the task with the rescheduling environment
uint64 targetBlock = uint64(block.number + 2);
(bool scheduled, uint256 executionCost, bytes32 taskId) = taskManager.scheduleTask(
    reschedulingEnvironmentAddress, // Use the rescheduling environment address
    100_000,                       // Gas limit
    targetBlock,                   // Target block
    type(uint256).max / 2,         // Maximum payment
    taskData                       // Encoded task data
);

require(scheduled, "Task scheduling failed");
```

### Task Cancellation and Authorization

Cancellation of tasks is strictly controlled to prevent unauthorized modifications.

#### Example: Cancelling a Task

```solidity
// Schedule a task as usual
uint64 targetBlock = uint64(block.number + 10);
(, , bytes32 taskId) = taskManager.scheduleTask(
    executionEnvironmentAddress,
    100_000,
    targetBlock,
    type(uint256).max / 2,
    taskData
);

// Later, the owner can cancel the task
taskManager.cancelTask(taskId);

// To grant cancellation authority to another address
address authorizedCanceller = 0xAbc...123;
taskManager.addTaskCanceller(taskId, authorizedCanceller);

// The authorized address can now cancel the task
vm.prank(authorizedCanceller);
taskManager.cancelTask(taskId);
```

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

## Summary

The Task Manager system provides a robust framework for scheduling and executing on-chain tasks. By following the standardized task encoding process and understanding the separation between scheduling and execution, developers can confidently integrate with the system while leveraging advanced features such as rescheduling and dynamic fee calculations.

For further information, please refer to the source code and internal test suites available in our repository.

