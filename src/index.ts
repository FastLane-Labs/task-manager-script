import { 
  encodeFunctionData, 
  createPublicClient, 
  http, 
  formatUnits, 
  createWalletClient, 
  encodePacked, 
  Address,
  decodeEventLog, 
  Hex 
} from "viem";
import dotenv from "dotenv";
import chalk from "chalk";

// Local imports
import { TaskManagerHelper } from "./utils/taskManager";
import { AddressHubHelper } from "./utils/addressHub";
import { ShmonadHelper } from "./utils/shmonad";
import { CHAIN, eoa } from "./constants";
import { TaskScheduledEvent } from "./types";

dotenv.config();

const ADDRESS_HUB = process.env.ADDRESS_HUB;
const RPC_URL = process.env.RPC_URL;

if (!ADDRESS_HUB || !RPC_URL) {
  throw new Error('Required environment variables not found');
}

async function main() {
  const publicClient = createPublicClient({
    chain: CHAIN,
    transport: http(RPC_URL)
  });

  // Get contract addresses from hub
  const addressHub = new AddressHubHelper(
    ADDRESS_HUB as `0x${string}`,
    publicClient
  );

  const taskManagerAddress = await addressHub.getTaskManagerAddress();
  const shmonadAddress = await addressHub.getShmonadAddress();

  console.log(chalk.blue('Contract Addresses'));
  console.log(chalk.blue('Task Manager      :'), chalk.yellow(taskManagerAddress));
  console.log(chalk.blue('Shmonad           :'), chalk.yellow(shmonadAddress));

  // Create wallet client
  const walletClient = createWalletClient({
    account: eoa,
    chain: CHAIN,
    transport: http(RPC_URL)
  });

  // Create TaskManager helper with wallet client
  const taskManager = new TaskManagerHelper(
    taskManagerAddress,
    publicClient,
    walletClient  // Add wallet client
  );

  // Get current state
  const currentBlock = await publicClient.getBlockNumber();
  console.log(chalk.blue('\nCurrent block:'), chalk.green(currentBlock.toString()));

  const policyId = await taskManager.contract.read.POLICY_ID() as bigint;
  console.log(chalk.blue('Policy ID:'), chalk.green(policyId.toString()));

  // Create Shmonad helper
  const shmonad = new ShmonadHelper(
    shmonadAddress,
    publicClient,
    walletClient
  );

  // Get balances
  const nativeBalance = await shmonad.getNativeBalance(eoa.address);
  const depositedAmount = await shmonad.getBalance(eoa.address);
  
  console.log(chalk.blue('Balances'));
  console.log(chalk.blue('Native Balance         :'), chalk.green(`${formatUnits(nativeBalance, 18)} MON`));
  console.log(chalk.blue('shMonad Balance        :'), chalk.green(`${formatUnits(depositedAmount, 18)} shMON`));

  const policyBond = await shmonad.getPolicyBond(policyId, eoa.address);
  console.log(chalk.blue('Policy Unbonding Amount:'), chalk.green(`${formatUnits(policyBond.unbonding, 18)} shMON`));
  console.log(chalk.blue('Policy Bonded Amount   :'), chalk.green(`${formatUnits(policyBond.bonded, 18)} shMON`));

  // Get execution environment template
  const executionEnv = await taskManager.contract.read.EXECUTION_ENV_TEMPLATE() as Address;
  console.log(chalk.blue('Execution Environment  :'), chalk.yellow(executionEnv));

  // First calculate estimated cost
  const dummyCall = encodeFunctionData({
    abi: [{
      type: 'function',
      name: 'dummyFunction',
      inputs: [],
      outputs: [],
      stateMutability: 'nonpayable'
    }],
    functionName: 'dummyFunction',
    args: []
  });

  // Pack target and calldata for execution environment
  const packedData = encodePacked(
    ['address', 'bytes'],
    [shmonadAddress, dummyCall]
  );

  // Encode for execution environment
  const task = {
    from: eoa.address,
    gas: BigInt(100000),
    target: executionEnv, // Use execution environment template instead of task manager
    data: encodeFunctionData({
      abi: [{
        type: 'function',
        name: 'executeTask',
        inputs: [{ type: 'bytes', name: 'taskData' }],
        outputs: [{ type: 'bool', name: 'success' }],
        stateMutability: 'nonpayable'
      }],
      functionName: 'executeTask',
      args: [packedData]
    }),
    // Nonce is handled automatically by viem
  };

  const schedule = {
    startBlock: currentBlock + BigInt(10),  // 10 blocks (~20 seconds) in the future
    executions: 1,                          // Single execution
    active: true,
    deadline: currentBlock + BigInt(5000),  // ~2.8 hours deadline
  };

  console.log(chalk.blue('\nSimulating task scheduling...'));
  const estimatedCost = await taskManager.estimateTaskCost(schedule.startBlock, task.gas);
  console.log(chalk.blue('Estimated cost:'), chalk.green(`${formatUnits(estimatedCost, 18)} MON`));

  // Then check bond requirements (should be greater than estimated cost)
  const requiredBond = estimatedCost * BigInt(2); // 2x safety margin
  
  if (!await shmonad.waitForSufficientBond(policyId, eoa.address, requiredBond)) {
    console.log(chalk.yellow('\nWarning: Insufficient bonded balance. Need to depositAndBond first.'));
    try {
      const txHash = await shmonad.depositAndBond(
        policyId,
        eoa.address,
        requiredBond
      );
      console.log(chalk.green('\nWaiting for transaction confirmation...'));
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log(chalk.green('Transaction confirmed!'));
    } catch (error) {
      console.error(chalk.red('Failed to deposit and bond:'), error);
      return;
    }
  }
  // Schedule the task
  try {
    console.log(chalk.blue('\nScheduling task...'));
    
    // First get the transaction hash
    const txHash = await taskManager.scheduleTaskRaw(
      executionEnv, 
      task.gas, 
      schedule.startBlock, 
      requiredBond, 
      packedData
    );
    console.log(chalk.blue('Transaction Hash:'), chalk.yellow(txHash));
    
    // Then wait for confirmation
    console.log(chalk.green('\nWaiting for transaction confirmation...'));
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    
    // Parse the TaskScheduled event from the logs using viem
    const taskAbi = taskManager.contract.abi;
    const taskScheduledLog = receipt.logs.find(log => {
      try {
        const event = decodeEventLog({
          abi: taskAbi,
          eventName: 'TaskScheduled',
          data: log.data,
          topics: log.topics,
        });
        return !!event;
      } catch {
        return false;
      }
    });
    
    if (taskScheduledLog) {
      const taskEvent = decodeEventLog({
        abi: taskAbi,
        eventName: 'TaskScheduled',
        data: taskScheduledLog.data,
        topics: taskScheduledLog.topics,
      }) as TaskScheduledEvent;
      
      if (taskEvent.args && 
          typeof taskEvent.args === 'object' && 
          !Array.isArray(taskEvent.args) &&
          'taskId' in taskEvent.args) {
        console.log(chalk.blue('Task ID:'), chalk.yellow(taskEvent.args.taskId));
      }
    }
    
    console.log(chalk.green('Task scheduled successfully!'));
  } catch (error) {
    console.error(chalk.red('Failed to schedule task:'), error);
    return;
  }
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error);
  process.exit(1);
});




