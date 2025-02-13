import { createPublicClient, http } from 'viem';
import { TaskManagerHelper } from '../utils/taskManager';
import { AddressHubHelper } from '../utils/addressHub';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const ADDRESS_HUB = process.env.ADDRESS_HUB;
const RPC_URL = process.env.RPC_URL;

console.log(chalk.blue('RPC URL:'), chalk.gray(RPC_URL));
console.log(chalk.blue('Address Hub:'), chalk.yellow(ADDRESS_HUB));

if (!ADDRESS_HUB || !RPC_URL) {
  throw new Error('Required environment variables not found');
}

async function main() {
  console.log(chalk.blue('Creating public client...'));
  const publicClient = createPublicClient({
    transport: http(RPC_URL)
  });

  console.log(chalk.blue('Creating AddressHub helper...'));
  const addressHub = new AddressHubHelper(
    ADDRESS_HUB as `0x${string}`,
    publicClient
  );

  try {
    console.log(chalk.blue('Getting current block...'));
    const currentBlock = await publicClient.getBlockNumber();
    console.log(chalk.blue('Current block:'), chalk.green(currentBlock.toString()));

    console.log(chalk.blue('Getting contract addresses...'));
    const taskManagerAddress = await addressHub.getTaskManagerAddress();
    const shmonadAddress = await addressHub.getShmonadAddress();

    console.log(chalk.blue('Task Manager Address:'), chalk.yellow(taskManagerAddress));
    console.log(chalk.blue('Shmonad Address:'), chalk.yellow(shmonadAddress));

    const taskManager = new TaskManagerHelper(
      taskManagerAddress,
      publicClient,
      {} as any
    );

    console.log(chalk.blue('Getting execution environment template...'));
    const envTemplate = await taskManager.contract.read.EXECUTION_ENV_TEMPLATE();
    console.log(chalk.blue('Execution Environment Template:'), chalk.yellow(envTemplate));
  } catch (error) {
    console.error(chalk.red('Error:'), error);
  }
}

console.log(chalk.blue('Starting script...'));
main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
}); 