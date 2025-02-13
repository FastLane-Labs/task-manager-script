import { 
  Address, 
  PublicClient,
  getContract
} from 'viem';
import addressHubAbi from '../abi/fastlaneAddressHub.json';
import { ContractPointer } from './contractPointers';

export class AddressHubHelper {
  public contract;

  constructor(
    address: Address,
    publicClient: PublicClient,
  ) {
    this.contract = getContract({
      address,
      abi: addressHubAbi,
      client: {
        public: publicClient,
      }
    });
  }

  async getTaskManagerAddress(): Promise<Address> {
    return await this.getAddressFromPointer(ContractPointer.TASK_MANAGER);
  }

  async getShmonadAddress(): Promise<Address> {
    return await this.getAddressFromPointer(ContractPointer.SHMONAD);
  }

  async getAddressFromPointer(pointer: ContractPointer): Promise<Address> {
    return await this.contract.read.getAddressFromPointer([BigInt(pointer)]) as Address;
  }

  async getPointerFromAddress(address: Address): Promise<ContractPointer> {
    const pointer = await this.contract.read.getPointerFromAddress([address]) as bigint;
    return pointer as ContractPointer;
  }

  async isFastLane(address: Address): Promise<boolean> {
    return await this.contract.read.isFastLane([address]) as boolean;
  }

  // Helper method to get any contract address by pointer
  async getContractAddress(pointer: ContractPointer): Promise<Address> {
    return await this.getAddressFromPointer(pointer);
  }
} 