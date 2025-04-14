import { createPublicClient, http, formatUnits } from 'viem';
import { AddressHubHelper } from '../utils/addressHub';
import { ShmonadHelper } from '../utils/shmonad';
import taskManagerAbi from '../abi/taskmanager.json';
import { eoa } from '../constants';
import dotenv from 'dotenv';
import chalk from 'chalk';

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

  // Get contract addresses
  const addressHub = new AddressHubHelper(
    ADDRESS_HUB as `0x${string}`,
    publicClient
  );

  const taskManagerAddress = await addressHub.getTaskManagerAddress();
  const shmonadAddress = await addressHub.getShmonadAddress();

  console.log(chalk.blue('Contract Addresses'));
  console.log(chalk.blue('Shmonad           :'), chalk.yellow(shmonadAddress));
  console.log(chalk.blue('Task Manager      :'), chalk.yellow(taskManagerAddress));
  

  // Create Shmonad helper
  const shmonad = new ShmonadHelper(
    shmonadAddress,
    publicClient
  );

  // Get policy ID from task manager
  const taskManagerPolicyId = await publicClient.readContract({
    address: taskManagerAddress,
    abi: taskManagerAbi,
    functionName: 'POLICY_ID'
  }) as bigint;

  console.log(chalk.blue('Policy ID         :'), chalk.green(taskManagerPolicyId.toString()));

  // Check bonds for deployer address
  const policyBond = await shmonad.getPolicyBond(taskManagerPolicyId, eoa.address);
  console.log(chalk.blue('Bond Status'));
  console.log(chalk.blue('Address           :'), chalk.yellow(eoa.address));
  console.log(chalk.blue('Bonded            :'), chalk.green(`${formatUnits(policyBond.bonded, 18)} shMON`));
  console.log(chalk.blue('Unbonding         :'), chalk.green(`${formatUnits(policyBond.unbonding, 18)} shMON`));
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error);
  process.exit(1);
}); 