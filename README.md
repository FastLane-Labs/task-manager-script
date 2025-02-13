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

# Task Manager Example Scripts

This repository contains example scripts for interacting with the Monad Task Manager system. It demonstrates task scheduling, execution, and monitoring capabilities.

## Scripts Overview

- `npm run demo` - Schedule a dummy task (main example)
- `npm run bonds` - Check bond status for your address
- `npm run execute` - Execute pending tasks
- `npm run env` - Get environment information
- `npm run addresses` - List contract addresses from hub

## Task Scheduling Example

The main demo (`src/index.ts`) shows how to:
1. Connect to contracts via AddressHub
2. Check and manage bonds
3. Schedule a task with proper encoding
4. Monitor task status

### Key Components

#### Address Hub
The AddressHub contract (`ADDRESS_HUB` in .env) provides addresses for:
- TaskManager
- Shmonad (bond management)
- Other system contracts

> **Testnet AddressHub**: `0xC9f0cDE8316AbC5Efc8C3f5A6b571e815C021B51`

```typescript
const addressHub = new AddressHubHelper(ADDRESS_HUB, publicClient);
const taskManagerAddress = await addressHub.getTaskManagerAddress();
const shmonadAddress = await addressHub.getShmonadAddress();
```

#### Bond Management
Before scheduling tasks, ensure sufficient bonds:
```typescript
const requiredBond = estimatedCost * BigInt(2); // 2x safety margin
if (!await shmonad.waitForSufficientBond(policyId, address, requiredBond)) {
  // Need to depositAndBond
}
```

#### Task Scheduling
Tasks require proper encoding:
1. Encode the target function call
2. Pack with target address
3. Encode for execution environment

```typescript
// 1. Encode target call
const targetCall = encodeFunctionData({/*...*/});

// 2. Pack data
const packedData = encodePacked(
  ['address', 'bytes'],
  [targetAddress, targetCall]
);

// 3. Encode for environment
const task = {
  target: executionEnv,
  data: encodeFunctionData({
    functionName: 'executeTask',
    args: [packedData]
  }),
  // ... other task parameters
};
```

## Customizing for Real Tasks

To schedule your own tasks:

1. Modify the target contract call in `src/index.ts`:
```typescript
const targetCall = encodeFunctionData({
  abi: yourContractAbi,
  functionName: 'yourFunction',
  args: [/* your args */]
});
```

2. Adjust task parameters:
```typescript
const task = {
  gas: BigInt(yourGasLimit),
  // ... other parameters
};

const schedule = {
  startBlock: currentBlock + BigInt(10),
  interval: BigInt(100),  // For recurring tasks
  executions: 1,          // Number of executions
  // ... other schedule parameters
};
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Configure:
```env
ADDRESS_HUB=        # Monad Address Hub
RPC_URL=           # Monad RPC URL
DEPLOYER_PRIVATE_KEY= # Your private key
```

## Security Notes

- Never commit private keys
- Test with small amounts first
- Verify bond amounts before scheduling
- Monitor task execution status

## Contract Interactions

The example uses three main contracts:
1. AddressHub - Contract registry
2. TaskManager - Task scheduling and execution
3. Shmonad - Bond management

Each has a corresponding helper class in `src/utils/`.

## Error Handling

Common issues:
- Insufficient bonds
- Invalid task encoding
- Execution environment issues

Check logs and events for debugging.