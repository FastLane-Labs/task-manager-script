import { createPublicClient, http } from 'viem';
import { AddressHubHelper } from '../utils/addressHub';
import { ContractPointer } from '../utils/contractPointers';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

dotenv.config();

const ADDRESS_HUB = process.env.ADDRESS_HUB;
const RPC_URL = process.env.RPC_URL;

if (!ADDRESS_HUB || !RPC_URL) {
  throw new Error('Required environment variables not found');
}

async function main() {
  const publicClient = createPublicClient({
    transport: http(RPC_URL)
  });

  const addressHub = new AddressHubHelper(
    ADDRESS_HUB as `0x${string}`,
    publicClient
  );

  try {
    // Get addresses
    const taskManagerAddress = await addressHub.getContractAddress(ContractPointer.TASK_MANAGER);
    const shmonadAddress = await addressHub.getContractAddress(ContractPointer.SHMONAD);

    // Print addresses
    console.log(chalk.blue('Contract Addresses'));
    console.log(chalk.blue('Task Manager      :'), chalk.yellow(taskManagerAddress));
    console.log(chalk.blue('Shmonad           :'), chalk.yellow(shmonadAddress));

    // Return addresses for use in other scripts
    return {
      taskManager: taskManagerAddress,
      shmonad: shmonadAddress
    };
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

// Check if file is being run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { main as getAddresses }; 