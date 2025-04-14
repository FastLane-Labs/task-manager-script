import { createPublicClient, http, formatUnits } from 'viem';
import { AddressHubHelper } from '../utils/addressHub';
import { ShmonadHelper } from '../utils/shmonad';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

dotenv.config();

const ADDRESS_HUB = process.env.ADDRESS_HUB;
const RPC_URL = process.env.RPC_URL;

if (!ADDRESS_HUB || !RPC_URL) {
  throw new Error('Required environment variables not found');
}

async function main(addressToQuery?: string) {
  // Default to using the environment variable if no address is provided
  const targetAddress = addressToQuery || process.env.ACCOUNT_ADDRESS;
  
  if (!targetAddress) {
    throw new Error('No address provided. Please specify an address as a command line argument or set ACCOUNT_ADDRESS in your .env file');
  }

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
    // Get shmonad address from the hub
    console.log(chalk.blue('Getting Shmonad contract address...'));
    const shmonadAddress = await addressHub.getShmonadAddress();
    console.log(chalk.blue('Shmonad Address:'), chalk.yellow(shmonadAddress));

    // Create Shmonad helper
    console.log(chalk.blue('Creating Shmonad helper...'));
    const shmonad = new ShmonadHelper(
      shmonadAddress,
      publicClient
    );

    // Log the address we're querying
    console.log(chalk.blue('\nQuerying balance for address:'), chalk.yellow(targetAddress));

    // Get shmonad balance
    const balance = await shmonad.getBalance(targetAddress as `0x${string}`);
    console.log(chalk.blue('Shmonad Token Balance:'), chalk.green(`${formatUnits(balance, 18)} shMON`));

    // Get native balance for comparison
    const nativeBalance = await shmonad.getNativeBalance(targetAddress as `0x${string}`);
    console.log(chalk.blue('Native Token Balance:'), chalk.green(`${formatUnits(nativeBalance, 18)} MON`));

    // Log raw RPC call format - this was requested in the user query
    console.log(chalk.blue('\nRaw RPC call equivalent:'));
    const rpcCall = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{
        to: shmonadAddress,
        data: `0x70a08231000000000000000000000000${targetAddress.substring(2).toLowerCase()}`
      }, 'latest']
    };

    return {
      address: targetAddress,
      shmonadBalance: balance,
      nativeBalance
    };
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

// Check if file is being run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Get address from command line argument if provided
  const addressArg = process.argv[2];
  main(addressArg).catch((error) => {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  });
}

export { main as getShmonadBalance }; 