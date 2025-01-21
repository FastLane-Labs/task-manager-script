# FastLane Task Manager Interface Documentation

## Overview

The `ITaskManager` interface is a core component of the FastLane task scheduling system, designed to manage and execute automated tasks on the Monad blockchain. It provides a comprehensive set of functions for scheduling, executing, and monitoring blockchain tasks with built-in reliability and gas optimization features.

The system allows users to:
- Schedule tasks for future execution
- Execute tasks immediately and schedule follow-ups
- Monitor task execution status
- Manage task bonds and gas requirements
- Query task schedules and execution blocks

## Data Structures

```solidity
struct Task {
    address from;     // Task owner
    uint64 gas;      // Gas limit (must be non-zero and <= LARGE_GAS)
    address target;   // Target contract
    bytes data;      // Call data
    uint64 nonce;    // Auto-incrementing nonce per user
}

struct TaskSchedule {
    uint64 startBlock;     // Start block (must be in future)
    uint64 interval;       // Blocks between executions (min 100)
    uint64 executions;     // Number of times to execute
    bool active;          // Active status
    uint64 deadline;      // Informational deadline
}

struct TaskDefinition {
    Task task;             // Task parameters
    TaskSchedule schedule; // Schedule parameters
}

struct TaskInfo {
    TaskDefinition definition;
    TaskMetrics metrics;
}
```

### Task Types
- `Task`: Represents a complete task instance
- `TaskSchedule`: Represents the scheduling paramters of a task
- `TaskDefinition`: Defines the `Task` and its `TaskSchedule`
- `TaskMetrics`: Contains task performance metrics and bond accounting
- `TaskInfo`: Defines the `TaskDefinition` and `TaskMetrics`


## Functions Reference

### Task Execution

#### executeQueuedTasks
```solidity
function executeQueuedTasks(uint256 targetGasReserve) 
    external returns (uint256 executed, uint256 failed)
```
Executes pending tasks while maintaining a specified gas reserve.
- Parameters:
  - `targetGasReserve`: Minimum gas to keep after execution
- Returns:
  - `executed`: Number of successfully executed tasks
  - `failed`: Number of failed task executions

#### executeAndSchedule
```solidity
function executeAndSchedule(TaskDefinition calldata taskDef)
    external returns (bytes32 taskHash, bool success, bytes memory returnData)
```
Executes a task immediately and schedules it for future executions.
- Parameters:
  - `taskDef`: Task configuration and schedule
- Returns:
  - `taskHash`: Unique identifier for the task
  - `success`: Execution success status
  - `returnData`: Data returned from task execution

### Task Management

#### scheduleTask
```solidity
function scheduleTask(TaskDefinition calldata taskDef) 
    external returns (bytes32 taskHash)
```
Schedules a task for future execution without immediate execution.
- Parameters:
  - `taskDef`: Task configuration and schedule
- Returns:
  - `taskHash`: Unique identifier for the scheduled task

#### updateTaskSchedule
```solidity
function updateTaskSchedule(bytes32 taskHash, TaskDefinition calldata newDefinition) 
    external
```
Updates an existing task's schedule.
- Parameters:
  - `taskHash`: Task identifier
  - `newDefinition`: Updated task configuration (only schedule changes allowed)

#### cancelTask
```solidity
function cancelTask(bytes32 taskHash) 
    external
```
Cancels a scheduled task.
- Parameters:
  - `taskHash`: Task identifier to cancel

### Task Queries

#### getAccountTasks
```solidity
function getAccountTasks(address account) 
    external view returns (bytes32[] memory)
```
Retrieves all tasks associated with an account.
- Parameters:
  - `account`: Address to query
- Returns: Array of task hashes

#### getTaskInfo
```solidity
function getTaskInfo(bytes32 taskHash) 
    external view returns (TaskInfo memory)
```
Retrieves detailed information about a specific task.
- Parameters:
  - `taskHash`: Task identifier
- Returns: Complete task information including definition and metrics

### Schedule Management

#### getTasksInRange
```solidity
function getTasksInRange(uint64 startBlock, uint64 endBlock) 
    external view returns (bytes32[] memory)
```
Retrieves tasks scheduled within a block range.
- Parameters:
  - `startBlock`: Starting block number (inclusive)
  - `endBlock`: Ending block number (inclusive)
- Returns: Array of task hashes

#### getNextExecutionBlockInRange
```solidity
function getNextExecutionBlockInRange(uint64 startBlock, uint64 endBlock) 
    external view returns (uint64)
```
Finds the earliest block with scheduled tasks in a range.
- Parameters:
  - `startBlock`: Starting block number (inclusive)
  - `endBlock`: Ending block number (inclusive)
- Returns: Earliest block number with tasks (0 if none found)

### Bond Management

#### estimateRequiredBond
```solidity
function estimateRequiredBond(TaskDefinition calldata taskDef, uint256 gasPrice)
    external view returns (uint256 requiredBond)
```
Calculates the required bond amount for a task.
- Parameters:
  - `taskDef`: Task configuration
  - `gasPrice`: Gas price for estimation
- Returns: Required bond amount in base currency

## Core Interface

```solidity
interface ITaskManager {
    /// @notice Execute queued tasks up to the target gas reserve
    /// @param targetGasReserve Amount of gas to reserve for after execution
    /// @return executed Number of tasks successfully executed
    /// @return failed Number of tasks that failed execution
    function executeQueuedTasks(uint256 targetGasReserve) external returns (uint256 executed, uint256 failed);

    /// @notice Execute a task immediately and schedule it for future executions
    /// @param taskDef The task definition
    /// @return taskHash Hash of the scheduled task
    /// @return success Whether immediate execution was successful
    /// @return returnData Return data from immediate execution
    function executeAndSchedule(TaskDefinition calldata taskDef)
        external
        returns (bytes32 taskHash, bool success, bytes memory returnData);

    /// @notice Schedule a task for future execution
    /// @param taskDef The task definition
    /// @return taskHash Hash of the scheduled task
    function scheduleTask(TaskDefinition calldata taskDef) external returns (bytes32 taskHash);

    /// @notice Update a task's schedule
    /// @param taskHash Hash of the task to update
    /// @param newDefinition New task definition (only schedule can be updated)
    function updateTaskSchedule(bytes32 taskHash, TaskDefinition calldata newDefinition) external;

    /// @notice Cancel a task
    /// @param taskHash Hash of the task to cancel
    function cancelTask(bytes32 taskHash) external;

    /// @notice Get all tasks for an account
    /// @param account The account to query
    /// @return Array of task hashes
    function getAccountTasks(address account) external view returns (bytes32[] memory);

    /// @notice Get information about a task
    /// @param taskHash Hash of the task to query
    /// @return Task information
    function getTaskInfo(bytes32 taskHash) external view returns (TaskInfo memory);

    /// @notice Get tasks scheduled in a block range
    /// @param startBlock Start block (inclusive)
    /// @param endBlock End block (inclusive)
    /// @return Array of task hashes
    function getTasksInRange(uint64 startBlock, uint64 endBlock) external view returns (bytes32[] memory);

    /// @notice Estimate required bond for a task
    /// @param taskDef The task definition
    /// @param gasPrice Gas price to use for estimation
    /// @return requiredBond Required bond amount
    function estimateRequiredBond(
        TaskDefinition calldata taskDef,
        uint256 gasPrice
    )
        external
        view
        returns (uint256 requiredBond);

    /// @notice Get the current nonce for an account's task submissions
    /// @param account The account to query
    /// @return Current nonce value for the account
    function getAccountNonce(address account) external view returns (uint64);

    /// @notice Get next execution blocks for specific tasks
    /// @param account The account to query (address(0) for account-independent query)
    /// @param taskHashes Array of task hashes to query
    /// @return resultHashes Array of task hashes
    /// @return nextBlocks Array of next execution blocks (0 if task is completed/inactive)
    function getNextExecutionBlocks(
        address account,
        bytes32[] calldata taskHashes
    )
        external
        view
        returns (bytes32[] memory resultHashes, uint64[] memory nextBlocks);

    /// @notice Get all tasks and their next execution blocks for an account
    /// @param account The account to query
    /// @return resultHashes Array of task hashes
    /// @return nextBlocks Array of next execution blocks (0 if task is completed/inactive)
    function getAccountTasksWithBlocks(address account)
        external
        view
        returns (bytes32[] memory resultHashes, uint64[] memory nextBlocks);

    /// @notice Get next execution blocks for specific tasks (account independent)
    /// @param taskHashes Array of task hashes to query
    /// @return resultHashes Array of task hashes
    /// @return nextBlocks Array of next execution blocks (0 if task is completed/inactive)
    function getNextBlocksForTasks(bytes32[] calldata taskHashes)
        external
        view
        returns (bytes32[] memory resultHashes, uint64[] memory nextBlocks);
}
```

## Usage Examples

### Scheduling a Task

```solidity
// Create task definition
TaskDefinition memory task = TaskDefinition({
    task: Task({
        from: msg.sender,
        gas: 100_000,
        target: targetContract,
        data: callData,
        nonce: taskManager.getAccountNonce(msg.sender)
    }),
    schedule: TaskSchedule({
        startBlock: uint64(block.number + 10),
        interval: 100,         // Minimum interval
        executions: 1,         // Execute once
        active: true,
        deadline: uint64(block.number + 1000)
    })
});

// Schedule the task
bytes32 taskHash = taskManager.scheduleTask(task);
```

### Executing Tasks

```solidity
// Direct execution
(bool success, bytes memory result) = taskManager.executeTask(taskHash);

// Batch execution
(uint256 executed, uint256 failed) = taskManager.executeQueuedTasks(MINIMUM_RESERVE);
```

### Managing Tasks

```solidity
// Cancel task
taskManager.cancelTask(taskHash);

// Update schedule
taskManager.updateTaskSchedule(taskHash, newDefinition);

// Get task info
TaskInfo memory info = taskManager.getTaskInfo(taskHash);
```

## Events

```solidity
// Task lifecycle events
event TaskScheduled(bytes32 indexed taskHash, address indexed owner, uint64 nextBlock);
event TaskExecuted(bytes32 indexed taskHash, address indexed executor, bool success, bytes returnData);
event TaskCancelled(bytes32 indexed taskHash, address indexed owner);
event TaskInactiveDueToInsufficientBonds(bytes32 indexed taskHash, address indexed owner, uint256 requiredBond);

// Task metrics events
event TaskExecutionRecorded(
    bytes32 indexed taskHash, bool success, uint256 gasUsed, uint256 successCount, uint256 failureCount
);

// Accounting events
event ExecutorReimbursed(bytes32 indexed taskHash, address indexed executor, uint256 amount);
event ProtocolFeeCollected(bytes32 indexed taskHash, uint256 amount);

// Batch operation events
event TasksExecuted(uint256 executed, uint256 failed);

// Config events
event TaskConfigUpdated(bytes32 indexed taskHash, address indexed owner);
```
## Gas Management

### Categories
- Small Tasks: <= 100,000 gas
- Medium Tasks: <= 250,000 gas
- Large Tasks: <= 750,000 gas

### Executing Tasks with Gas Management
```solidity
// Execute tasks while keeping 100,000 gas in reserve
(uint256 executed, uint256 failed) = taskManager.executeQueuedTasks(100000);
```

### Monitoring Task Status
```solidity
// Get task information
TaskInfo memory info = taskManager.getTaskInfo(taskHash);

// Check next execution block
(bytes32[] memory hashes, uint64[] memory blocks) = taskManager.getNextBlocksForTasks([taskHash]);
```

## Additional Notes

### Security Considerations
1. Task execution requires sufficient bonds to cover gas costs
2. Only task owners can modify or cancel their tasks
3. Gas estimation should account for varying network conditions

### Design Decisions
1. Block-based scheduling for deterministic execution timing
2. Bond system ensures economic security
3. Flexible scheduling allows for both one-time and recurring tasks

### Limitations
1. Task execution is subject to block gas limits
2. Schedule updates can only modify timing, not task data
3. Tasks must be properly bonded before execution