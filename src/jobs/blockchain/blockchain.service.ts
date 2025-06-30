import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider, RpcProvider, Contract } from 'starknet';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus } from '../enums/transaction-status.enum';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: Provider;

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {
    const rpcUrl =
      // this should be replaced with your actual RPC URL or use an environment variable
      process.env.STARKNET_RPC_URL || 'https://free-rpc.starknet.io';
    this.provider = new RpcProvider({ nodeUrl: rpcUrl });
    this.logger.log(`Connected to Starknet RPC at ${rpcUrl}`);
  }

  /**
   * This is just an example of a Starknet contract instance.
   */
  getContract(address: string, abi: any): Contract {
    return new Contract(abi, address, this.provider);
  }

  /**
   * Log a transaction to the database
   */
  async logTransaction(data: Partial<Transaction>): Promise<Transaction> {
    const tx = this.transactionRepository.create(data);
    return this.transactionRepository.save(tx);
  }

  /**
   * Make a payment by calling the smart contract
   * @param recipient - Starknet address to send payment to
   * @param amount - Amount to send
   * @param abi - Contract ABI
   * @param contractAddress - Contract address
   */
  async makePayment(
    recipient: string,
    amount: number,
    abi: any,
    contractAddress: string,
    from: string,
    type = 'payment',
  ): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, abi);
      // Replace 'transfer' with your contract's payment function name
      const tx = await contract.invoke('transfer', [recipient, amount]);
      this.logger.log(`Payment transaction sent: ${tx.transaction_hash}`);
      // Log transaction as pending
      await this.logTransaction({
        txHash: tx.transaction_hash,
        status: TransactionStatus.PENDING,
        from,
        to: recipient,
        amount,
        type,
      });
      return tx.transaction_hash;
    } catch (error) {
      this.logger.error('Payment failed', error);
      throw error;
    }
  }

  /**
   * Update the status of a transaction in the database
   */
  async updateTransactionStatus(
    txHash: string,
    status: TransactionStatus,
  ): Promise<void> {
    await this.transactionRepository.update({ txHash }, { status });
  }

  /**
   * Track the status of a transaction by its hash
   * @param txHash - Transaction hash to check
   * @returns status string (e.g., 'pending', 'confirmed', 'rejected')
   */
  async trackTransactionStatus(txHash: string): Promise<TransactionStatus> {
    try {
      const txReceipt = await this.provider.getTransactionReceipt(txHash);
      let status: TransactionStatus = TransactionStatus.PENDING;
      if (!txReceipt) {
        status = TransactionStatus.PENDING;
      } else {
        const chainStatus =
          (txReceipt as any).finality_status ||
          (txReceipt as any).execution_status ||
          'unknown';
        switch (chainStatus) {
          case 'ACCEPTED_ON_L1':
          case 'ACCEPTED_ON_L2':
            status = TransactionStatus.CONFIRMED;
            break;
          case 'REJECTED':
            status = TransactionStatus.REJECTED;
            break;
          case 'FAILED':
            status = TransactionStatus.FAILED;
            break;
          default:
            status = TransactionStatus.UNKNOWN;
        }
      }
      await this.updateTransactionStatus(txHash, status);
      this.logger.log(`Transaction ${txHash} status: ${status}`);
      return status;
    } catch (error) {
      this.logger.error('Error tracking transaction status', error);
      throw error;
    }
  }
}
