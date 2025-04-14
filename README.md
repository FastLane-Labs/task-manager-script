# FastLane Task Manager Interface Documentation

## Overview

The **Task Manager** is a decentralized system that enables scheduling transactions for specific block heights on the Monad blockchain. It provides economic incentives for executors to include these transactions in their target blocks, creating a robust on-chain automation framework tailored for Monad's unique architecture.

Its primary goals are to:

- **Record Tasks Securely:** When tasks are scheduled, they are recorded along with essential metadata such as the owner's address, a unique nonce, and task-specific parameters
- **Execute Tasks Reliably:** Tasks execute in isolated environments with dedicated proxies for security and gas efficiency
- **Provide Economic Security:** The system uses a bonding mechanism via shMONAD tokens to secure tasks against malicious behavior
- **Optimize Load:** A load balancing mechanism dynamically distributes tasks across blocks, taking into account network conditions and historical execution metrics

:::note
While FastLane currently operates the executor service, the system is designed to support multiple competing executors in the future.
:::

## Core Concepts

### Task Categories & Load Balancing

Tasks are categorized by gas usage to facilitate efficient scheduling and load balancing:
- **Small Tasks**: ≤ 100,000 gas
- **Medium Tasks**: ≤ 250,000 gas
- **Large Tasks**: ≤ 750,000 gas

The system maintains separate queues for each category and automatically advances block pointers to skip blocks with no pending tasks.

### Scheduling vs. Execution

#### Scheduling
- **Task Recording:** When a task is scheduled, all necessary details (owner, nonce, task size, target address, and encoded call data) are recorded in the system
- **Environment & Proxy:** The Task Manager deploys a minimal, task-specific proxy contract (mimic) which will `delegatecall` the implementation contract during execution
- **Payment Options:** Tasks can be scheduled using direct MON payment or bonded shMONAD tokens for economic security

#### Execution
- **Execution Timing:** Tasks are executed at their `targetBlock` (or later, if the block is congested)
- **Isolation:** Each task executes in its own isolated environment via a proxy
- **Fee Distribution:** Fees are automatically distributed to executors upon successful execution

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
// Schedule the task with direct MON payment
(bool scheduled, uint256 executionCost, bytes32 taskId) = taskManager.scheduleTask(
    executionEnvironmentAddress,  // Environment address
    100_000,                     // Gas limit
    uint64(block.number + 2),    // Target block
    type(uint256).max / 2,       // Maximum payment
    taskData,                    // Encoded task data
    { value: executionCost }     // Pay with MON
);

// Or schedule with bonded shMONAD tokens
(bool scheduled, uint256 executionCost, bytes32 taskId) = taskManager.scheduleWithBond(
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

## Economic Model

The Task Manager uses a transparent economic framework:

| Task Type | Size Category | Gas Limit | Typical Bond Requirement |
|-----------|---------------|-----------|--------------------------|
| Small     | ≤ 100,000 gas | 100,000   | 0.01-0.05 shMONAD        |
| Medium    | ≤ 250,000 gas | 250,000   | 0.05-0.15 shMONAD        |
| Large     | ≤ 750,000 gas | 750,000   | 0.15-0.50 shMONAD        |

When a task executes successfully, the collected fees are distributed:
- **Task Executor (70%)**: Rewards the entity that provides computation resources
- **Block Validator (20%)**: Compensates validators for including execution transactions
- **shMONAD Yield (10%)**: Contributes to staking yields and protocol sustainability

## Advanced Features

For detailed information about:
- Custom execution environments
- Rescheduling and retry logic
- Task cancellation and authorization
- Economic security and fee calculations

See the [examples/README.md](./examples/README.md) documentation.

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
    
    function scheduleWithBond(
        address implementation,
        uint256 taskGasLimit,
        uint64 targetBlock,
        uint256 maxPayment,
        bytes calldata taskCallData
    ) external returns (bool scheduled, uint256 executionCost, bytes32 taskId);
    
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

These scripts are organized by functionality to help you navigate the Task Manager system:

### Core Scripts
- `npm run build` - Build TypeScript files
- `npm run demo` - Schedule a dummy task (main example)

### Information Scripts
- `npm run info:env` - Get environment information
- `npm run info:addresses` - List contract addresses from hub

### shMONAD Utility Scripts
- `npm run shmonad:balance [address]` - Check shMONAD and MON balances
- `npm run shmonad:balance:log [address]` - Check balances with detailed RPC logging
- `npm run shmonad:bonds` - Check bond status for your address

### Task Management Scripts
- `npm run task:execute` - Execute pending tasks

## Prerequisites

Before running the demo script, ensure you have:

1. **MON tokens** - You'll need native MON tokens to:
   - Pay for gas fees
   - Deposit and bond for task scheduling
   - The demo script automatically deposits and bonds if you have insufficient bonded balance

2. **Private key configured** - Set up your private key in the `.env` file
   
3. **RPC access** - Ensure your RPC endpoint is working

You can check your current balance with:
```
npm run shmonad:balance YOUR_ADDRESS
```

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

#### Task Execution

After scheduling a task, it needs to be executed at the target block. There are two ways to execute tasks:

1. **Automatic execution**: FastLane executors will automatically pick up and execute your task at the scheduled block

2. **Manual execution**: You can execute tasks yourself using:
```bash
npm run task:execute
```

The execution script:
- Connects to the TaskManager contract
- Calls the `executeTasks` function
- Provides gas for execution and earns execution fees
- Reports success/failure and fees earned

Task execution is an open process - anyone can execute pending tasks and earn the associated fees.

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