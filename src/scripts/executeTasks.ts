import { createPublicClient, createWalletClient, http } from 'viem';
import { AddressHubHelper } from '../utils/addressHub';
import { TaskManagerHelper } from '../utils/taskManager';
import { eoa, CHAIN } from '../constants';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { formatUnits } from 'viem';

dotenv.config();

const ADDRESS_HUB = process.env.ADDRESS_HUB;
const RPC_URL = process.env.RPC_URL;

if (!ADDRESS_HUB || !RPC_URL) {
  throw new Error('Required environment variables not found');
}

async function main() {
  console.log(chalk.blue('Creating clients...'));
  const publicClient = createPublicClient({
    transport: http(RPC_URL)
  });

  const walletClient = createWalletClient({
    account: eoa,
    chain: CHAIN,
    transport: http(RPC_URL)
  });

  // Get contract addresses
  const addressHub = new AddressHubHelper(
    ADDRESS_HUB as `0x${string}`,
    publicClient
  );

  const taskManagerAddress = await addressHub.getTaskManagerAddress();
  console.log(chalk.blue('\nTask Manager:'), chalk.yellow(taskManagerAddress));

  // Create TaskManager helper
  const taskManager = new TaskManagerHelper(
    taskManagerAddress,
    publicClient,
    walletClient
  );

  // Execute tasks
  try {
    console.log(chalk.blue('\nExecuting tasks...'));
    const feesEarned = await taskManager.executeTasks(eoa.address);
    console.log(chalk.green('\nExecution complete'));
    console.log(chalk.blue('Fees earned:'), chalk.green(`${formatUnits(feesEarned, 18)} MON`));
  } catch (error) {
    console.error(chalk.red('Failed to execute tasks:'), error);
    return;
  }
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error);
  process.exit(1);
}); 