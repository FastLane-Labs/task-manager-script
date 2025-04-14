import { 
  Address, 
  PublicClient, 
  WalletClient,
  getContract,
  decodeEventLog
} from 'viem';
import taskManagerAbi from '../abi/taskmanager.json';

export class TaskManagerHelper {
  public contract;
  private publicClient: PublicClient;

  constructor(
    address: Address,
    publicClient: PublicClient,
    walletClient: WalletClient
  ) {
    this.publicClient = publicClient;
    this.contract = getContract({
      address,
      abi: taskManagerAbi,
      client: {
        public: publicClient,
        wallet: walletClient,
        account: walletClient.account,
      }
    });
  }

  async estimateTaskCost(
    targetBlock: bigint,
    gasLimit: bigint
  ): Promise<bigint> {
    return await this.contract.read.estimateCost([targetBlock, gasLimit]) as bigint;
  }

  // New method that just returns the transaction hash
  async scheduleTaskRaw(
    environment: Address,
    gasLimit: bigint,
    targetBlock: bigint, 
    maxPayment: bigint,
    taskCallData: `0x${string}`
  ): Promise<`0x${string}`> {
    return await this.contract.write.scheduleTask(
      [environment, gasLimit, targetBlock, maxPayment, taskCallData],
      { value: maxPayment }
    );
  }

  async scheduleTask(
    environment: Address,
    gasLimit: bigint,
    targetBlock: bigint,
    maxPayment: bigint,
    taskData: `0x${string}`
  ) {
    const hash = await this.contract.write.scheduleTask(
      [environment, gasLimit, targetBlock, maxPayment, taskData],
      { value: maxPayment }
    );

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    
    const scheduledEvent = receipt.logs.find(log => {
      try {
        const event = decodeEventLog({
          abi: taskManagerAbi,
          data: log.data,
          topics: log.topics,
        });
        return event.eventName === 'TaskScheduled';
      } catch {
        return false;
      }
    });

    if (!scheduledEvent) {
      throw new Error('Task scheduling failed - no TaskScheduled event found');
    }

    const { eventName, args } = decodeEventLog({
      abi: taskManagerAbi,
      data: scheduledEvent.data,
      topics: scheduledEvent.topics,
      eventName: 'TaskScheduled'
    });

    return {
      taskId: args?.[0] as `0x${string}`,
      owner: args?.[1] as `0x${string}`,
      targetBlock: args?.[2] as bigint
    };
  }

  async executeTasks(
    payoutAddress: Address,
    targetGasReserve: bigint = 0n
  ): Promise<bigint> {
    console.log('Attempting to submit executeTasks transaction...');
    let hash;
    try {
      hash = await this.contract.write.executeTasks(
        [payoutAddress, targetGasReserve],
        { gas: BigInt(1_000_000) }  // 1 million gas limit for execution
      );
      console.log('Got transaction hash:', hash);
    } catch (error) {
      console.error('Failed to submit transaction:', error);
      throw error;
    }
    
    console.log('Waiting for transaction confirmation...');
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    console.log('Transaction confirmed:', hash);

    return receipt.status === 'success' ? BigInt(1) : BigInt(0);  // Return fees earned
  }

  async isTaskExecuted(taskId: `0x${string}`): Promise<boolean> {
    return await this.contract.read.isTaskExecuted([taskId]) as boolean;
  }

  async isTaskCancelled(taskId: `0x${string}`): Promise<boolean> {
    return await this.contract.read.isTaskCancelled([taskId]) as boolean;
  }

  async getNextExecutionBlock(
    startBlock: bigint,
    endBlock: bigint
  ): Promise<bigint> {
    return await this.contract.read.getNextExecutionBlockInRange([startBlock, endBlock]) as bigint;
  }
} 