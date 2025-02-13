import { 
  Address, 
  PublicClient,
  WalletClient,
  getContract,
  parseUnits,
  encodeFunctionData
} from 'viem';
import shmonadAbi from '../abi/shmonad.json';
import { PolicyBond } from '../types';
import chalk from 'chalk';
import { formatUnits } from 'viem';

export class ShmonadHelper {
  public contract;
  private publicClient: PublicClient;
  private walletClient?: WalletClient;

  constructor(
    address: Address,
    publicClient: PublicClient,
    walletClient?: WalletClient
  ) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.contract = getContract({
      address,
      abi: shmonadAbi,
      client: {
        public: publicClient,
        wallet: walletClient
      }
    });
  }

  async getBalance(address: Address): Promise<bigint> {
    return await this.contract.read.balanceOf([address]) as bigint;
  }

  async getNativeBalance(address: Address): Promise<bigint> {
    return await this.publicClient.getBalance({ address });
  }

  async getPolicyBond(policyId: bigint, address: Address): Promise<PolicyBond> {
    const bonded = await this.contract.read.balanceOfBonded([policyId, address]) as bigint;
    const unbonding = await this.contract.read.balanceOfUnbonding([policyId, address]) as bigint;
    
    return {
      bonded,
      unbonding
    };
  }

  async encodeDepositAndBond(
    policyId: bigint,
    bondRecipient: Address,
    amountToBond: bigint
  ): Promise<`0x${string}`> {
    return encodeFunctionData({
      abi: shmonadAbi,
      functionName: 'depositAndBond',
      args: [policyId, bondRecipient, amountToBond]
    });
  }

  async shouldDepositAndBond(policyId: bigint, address: Address, requiredAmount: bigint): Promise<boolean> {
    const policyBond = await this.getPolicyBond(policyId, address);
    return policyBond.bonded < requiredAmount;
  }

  async waitForSufficientBond(
    policyId: bigint, 
    address: Address, 
    requiredAmount: bigint
  ): Promise<boolean> {
    console.log(chalk.blue('\nChecking bond status...'));
    const policyBond = await this.getPolicyBond(policyId, address);
    
    if (policyBond.bonded >= requiredAmount) {
      console.log(chalk.green('✓ Sufficient bond amount'));
      return true;
    }

    console.log(chalk.yellow('✗ Insufficient bond amount'));
    console.log(chalk.blue('Current:  '), chalk.yellow(`${formatUnits(policyBond.bonded, 18)} shMON`));
    console.log(chalk.blue('Required: '), chalk.yellow(`${formatUnits(requiredAmount, 18)} shMON`));
    return false;
  }

  async depositAndBond(
    policyId: bigint,
    bondRecipient: Address,
    amountToBond: bigint
  ): Promise<`0x${string}`> {
    if (!this.walletClient) {
      throw new Error('Wallet client required for transactions');
    }

    console.log(chalk.blue('\nSubmitting depositAndBond transaction...'));
    const hash = await this.contract.write.depositAndBond(
      [policyId, bondRecipient, amountToBond],
      { value: amountToBond }
    );
    
    console.log(chalk.green('Transaction submitted:'), chalk.yellow(hash));
    return hash;
  }
} 