//SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

/// @title TaskTypes
/// @notice Core data structures for the task management system
/// @dev Contains all type definitions used across the task manager system

/// @notice Metadata for task ownership and status tracking
/// @dev Used for task management and access control
struct TaskMetadata {
    address owner; // Owner of the task
    uint64 nonce; // to track different tasks from same owner
    Size size; // small, medium, or large gas.
}

/// @notice Gas consumption categories for tasks
/// @dev Used for load balancing and fee calculation
enum Size {
    Small, // For lightweight operations
    Medium, // For moderate complexity operations
    Large // For complex operations

}