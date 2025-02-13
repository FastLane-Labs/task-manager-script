// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { TaskMetadata } from "./TaskTypes.sol";

/// @title ITaskManager
/// @notice User-facing interface for scheduling and managing automated task execution
/// @dev Core contract for task scheduling, execution, and management with economic security mechanisms
interface ITaskManager {
    /*//////////////////////////////////////////////////////////////
                           TASK MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /// @notice Schedule a task for future execution
    /// @dev Requires sufficient shMONAD bonded to cover execution costs. Task will be assigned to an appropriate block
    /// based on size and load balancing
    /// @param implementation The contract address that is delegatecalled
    /// @param taskGasLimit The gas limit of the task's execution
    /// @param targetBlock The desired block number when the task should execute (actual execution block may vary based
    /// on load)
    /// @param maxPayment Maximum payment willing to pay for execution
    /// @param taskCallData The encoded function call data for the task
    /// @return scheduled Bool for whether or not the task was scheduled
    /// @return executionCost The estimated cost of the task
    /// @return taskId Unique identifier for tracking the scheduled task (derived from owner and nonce)
    function scheduleTask(
        address implementation,
        uint256 taskGasLimit,
        uint64 targetBlock,
        uint256 maxPayment,
        bytes calldata taskCallData
    )
        external
        payable
        returns (bool scheduled, uint256 executionCost, bytes32 taskId);

    /// @notice Reschedule the currently executing task
    /// @param targetBlock The block to reschedule to
    /// @param maxPayment Maximum payment willing to pay for execution
    function rescheduleTask(
        uint64 targetBlock,
        uint256 maxPayment
    )
        external
        payable
        returns (bool rescheduled, uint256 executionCost, bytes32 taskId);

    /// @notice Cancel a task
    /// @param taskId The id of the task to cancel
    function cancelTask(bytes32 taskId) external;

    /// @notice Execute queued tasks up to the target gas reserve
    /// @param payoutAddress The beneficiary of any payouts
    /// @param targetGasReserve Amount of gas to reserve for after execution
    /// @return feesEarned Amount of fees earned from execution
    function executeTasks(address payoutAddress, uint256 targetGasReserve) external returns (uint256 feesEarned);

    /// @notice Alerts whether or not a task is cancelled
    /// @param taskId The id of the task to cancel
    /// @return cancelled Bool for whether or not the task was cancelled
    function isTaskCancelled(bytes32 taskId) external view returns (bool cancelled);

    /// @notice Alerts whether or not a task is cancelled
    /// @param taskId The id of the task to cancel
    /// @return executed Bool for whether or not the task was executed
    function isTaskExecuted(bytes32 taskId) external view returns (bool executed);

    /// @notice Estimate the required bond for a task
    /// @param targetBlock The block to schedule the task for
    /// @param taskGasLimit The gas limit of the task's execution
    /// @return cost The estimated cost of the task
    function estimateCost(uint64 targetBlock, uint256 taskGasLimit) external view returns (uint256 cost);

    /// @notice Get the earliest block number in the range that has scheduled tasks
    /// @param startBlock Start block (inclusive)
    /// @param endBlock End block (inclusive)
    /// @return The earliest block number with tasks, or 0 if none found
    function getNextExecutionBlockInRange(uint64 startBlock, uint64 endBlock) external view returns (uint64);

    /// @notice Get metadata about a task
    /// @param taskId ID of the task to query
    /// @return Task metadata
    function getTaskMetadata(bytes32 taskId) external view returns (TaskMetadata memory);

    /// @notice Add an address as a canceller authorized to cancel a specific task
    /// @param taskId The task ID to add the canceller for
    /// @param canceller The address to authorize as task canceller
    function addTaskCanceller(bytes32 taskId, address canceller) external;

    /// @notice Add an address as a canceller authorized to cancel all tasks for a task environment
    /// @param taskId The task ID used to verify ownership and get environment
    /// @param canceller The address to authorize as environment canceller
    function addEnvironmentCanceller(bytes32 taskId, address canceller) external;

    /// @notice Remove an address as a task-specific canceller
    /// @param taskId The task ID to remove the canceller from
    /// @param canceller The address to deauthorize
    function removeTaskCanceller(bytes32 taskId, address canceller) external;

    /// @notice Remove an address as an environment-wide canceller
    /// @param taskId The task ID used to verify ownership and get environment
    /// @param canceller The address to deauthorize
    function removeEnvironmentCanceller(bytes32 taskId, address canceller) external;
}
