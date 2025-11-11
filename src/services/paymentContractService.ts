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
    txHash: string,
    expectedAmount: number,
    creatorAddress: string
  ): Promise<boolean> {
    try {
      if (!this.contractAddress) {
        throw new Error('Contract not initialized');
      }

      // Get recent transactions for the contract
      const transactions = await this.client.getTransactions(this.contractAddress, { limit: 10 });

      // Find the transaction with matching hash
      const transaction = transactions.find((tx) => {
        const hash = tx.hash().toString('base64');
        return hash === txHash;
      });

      if (!transaction) {
        logger.warn(`Transaction not found: ${txHash}`);
        return false;
      }

      // Verify transaction details
      const inMessage = transaction.inMessage;
      if (!inMessage || inMessage.info.type !== 'internal') {
        return false;
      }

      // Check amount (with some tolerance for fees)
      const receivedAmount = Number(inMessage.info.value.coins) / 1e9;
      const expectedMin = expectedAmount * 0.95; // 5% tolerance

      if (receivedAmount < expectedMin) {
        logger.warn(`Amount mismatch. Expected: ${expectedAmount}, Received: ${receivedAmount}`);
        return false;
      }

      logger.info(`Transaction verified successfully: ${txHash}`);
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
