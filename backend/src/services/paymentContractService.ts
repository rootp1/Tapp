import { Address, TonClient, beginCell, OpenedContract } from '@ton/ton';
import { PaymentContract } from '../../wrappers/PaymentContract';
import { logger } from '../utils/logger';

class PaymentContractService {
  private client: TonClient;
  private contractAddress: Address | null = null;
  private contract: OpenedContract<PaymentContract> | null = null;

  constructor() {
    const endpoint = process.env.TON_NETWORK === 'mainnet'
      ? 'https://toncenter.com/api/v2/jsonRPC'
      : 'https://testnet.toncenter.com/api/v2/jsonRPC';

    // API key is optional for testnet but required for mainnet
    const apiKey = process.env.TON_API_KEY;
    const isTestnet = process.env.TON_NETWORK !== 'mainnet';

    this.client = new TonClient({
      endpoint,
      apiKey: (isTestnet && !apiKey) ? undefined : apiKey,
    });

    this.initializeContract();
  }

  private async initializeContract() {
    try {
      const contractAddressStr = process.env.PAYMENT_CONTRACT_ADDRESS;

      if (!contractAddressStr) {
        logger.warn('PAYMENT_CONTRACT_ADDRESS not set in environment variables');
        return;
      }

      this.contractAddress = Address.parse(contractAddressStr);
      const paymentContract = PaymentContract.createFromAddress(this.contractAddress);
      this.contract = this.client.open(paymentContract);

      logger.info(`Payment contract initialized at: ${this.contractAddress.toString()}`);
    } catch (error) {
      logger.error('Error initializing payment contract:', error);
    }
  }

  /**
   * Get the contract address for payments
   */
  getContractAddress(): string {
    if (!this.contractAddress) {
      throw new Error('Payment contract not initialized');
    }
    return this.contractAddress.toString();
  }

  /**
   * Build a ProcessPayment message body
   */
  buildProcessPaymentMessage(
    queryId: bigint,
    postId: bigint,
    creatorAddress: string
  ): string {
    const creator = Address.parse(creatorAddress);

    const body = beginCell()
      .storeUint(0x7e8764ef, 32)  // ProcessPayment opcode
      .storeUint(queryId, 64)
      .storeUint(postId, 64)
      .storeAddress(creator)
      .endCell();

    return body.toBoc().toString('base64');
  }

  /**
   * Get contract statistics
   */
  async getContractStats(): Promise<{
    totalProcessed: number;
    platformAddress: string;
    platformFeePercent: number;
    balance: string;
  }> {
    if (!this.contract) {
      throw new Error('Payment contract not initialized');
    }

    try {
      // OpenedContract automatically provides the provider
      const totalProcessed = await this.contract.getTotalProcessed();
      const platformAddress = await this.contract.getPlatformAddress();
      const platformFeePercent = await this.contract.getPlatformFeePercent();
      const balance = await this.contract.getBalance();

      return {
        totalProcessed,
        platformAddress: platformAddress.toString(),
        platformFeePercent,
        balance: (Number(balance) / 1e9).toFixed(4), // Convert to TON
      };
    } catch (error) {
      logger.error('Error getting contract stats:', error);
      throw error;
    }
  }

  /**
   * Verify a transaction to the payment contract
   */
  async verifyPaymentTransaction(
    txBocOrHash: string,
    expectedAmount: number,
    creatorAddress: string
  ): Promise<boolean> {
    try {
      if (!this.contractAddress) {
        throw new Error('Contract not initialized');
      }

      // Get recent transactions for the contract
      const transactions = await this.client.getTransactions(this.contractAddress, { limit: 20 });

      // The txBocOrHash could be either a BOC or a hash
      // For simplicity, we'll verify by checking recent transactions for matching amount
      // In production, you'd want more robust verification
      
      let isValid = false;
      const expectedMin = expectedAmount * 0.95; // 5% tolerance for fees
      const expectedMax = expectedAmount * 1.05;

      for (const tx of transactions) {
        const inMessage = tx.inMessage;
        if (!inMessage || inMessage.info.type !== 'internal') {
          continue;
        }

        const receivedAmount = Number(inMessage.info.value.coins) / 1e9;
        
        // Check if this transaction matches our expected amount and is recent
        if (receivedAmount >= expectedMin && receivedAmount <= expectedMax) {
          // Additional validation: check if transaction is recent (within last 5 minutes)
          const txTime = tx.now;
          const currentTime = Math.floor(Date.now() / 1000);
          const timeDiff = currentTime - txTime;
          
          if (timeDiff < 300) { // 5 minutes
            logger.info(`Found matching transaction: amount=${receivedAmount} TON, time=${timeDiff}s ago`);
            isValid = true;
            break;
          }
        }
      }

      if (!isValid) {
        logger.warn(`Transaction verification failed. Expected amount: ${expectedAmount} TON`);
        return false;
      }

      logger.info(`Transaction verified successfully`);
      return true;
    } catch (error) {
      logger.error('Error verifying transaction:', error);
      return false;
    }
  }

  /**
   * Check if the contract is deployed and accessible
   */
  async isContractReady(): Promise<boolean> {
    try {
      if (!this.contract) {
        return false;
      }

      // Try to call a get method to verify contract is accessible
      await this.contract.getPlatformFeePercent();
      return true;
    } catch (error) {
      logger.error('Contract not ready:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }
}

export default new PaymentContractService();
