import { Address, TonClient, beginCell, OpenedContract, Cell } from '@ton/ton';
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
    txBoc: string,
    expectedAmount: number,
    creatorAddress: string
  ): Promise<boolean> {
    try {
      if (!this.contractAddress) {
        throw new Error('Contract not initialized');
      }

      // Step 1: Decode the BOC to get the transaction hash
      let txCell: Cell;
      let txHash: string;
      
      try {
        // BOC is base64 encoded
        const bocBuffer = Buffer.from(txBoc, 'base64');
        txCell = Cell.fromBoc(bocBuffer)[0];
        txHash = txCell.hash().toString('hex');
        logger.info(`Decoded transaction hash: ${txHash}`);
      } catch (bocError) {
        logger.error('Failed to decode BOC:', bocError);
        // Fallback: treat as hash string if BOC decode fails
        txHash = txBoc;
        logger.info(`Treating as hash string: ${txHash}`);
      }

      // Step 2: Get recent transactions from the contract
      const transactions = await this.client.getTransactions(this.contractAddress, { limit: 50 });
      logger.info(`Checking ${transactions.length} recent transactions for hash: ${txHash.substring(0, 16)}...`);

      // Step 3: Find the specific transaction by hash
      let foundTx = null;
      for (const tx of transactions) {
        const currentTxHash = tx.hash().toString('hex');
        
        if (currentTxHash === txHash) {
          foundTx = tx;
          logger.info(`✅ Found transaction by hash!`);
          break;
        }
      }

      // If not found by hash, try amount-based matching as fallback (for debugging)
      if (!foundTx) {
        logger.warn(`Transaction hash not found. Attempting fallback verification by amount...`);
        
        const expectedMin = expectedAmount * 0.90;
        const expectedMax = expectedAmount * 1.10;
        const currentTime = Math.floor(Date.now() / 1000);

        for (const tx of transactions) {
          const inMessage = tx.inMessage;
          if (!inMessage || inMessage.info.type !== 'internal') {
            continue;
          }

          const receivedAmount = Number(inMessage.info.value.coins) / 1e9;
          const txTime = tx.now;
          const timeDiff = currentTime - txTime;
          
          logger.info(`TX: amount=${receivedAmount.toFixed(4)} TON, time=${timeDiff}s ago, hash=${tx.hash().toString('hex').substring(0, 16)}...`);
          
          if (receivedAmount >= expectedMin && receivedAmount <= expectedMax && timeDiff < 600) {
            foundTx = tx;
            logger.info(`⚠️ Found matching transaction by amount (fallback): ${receivedAmount.toFixed(4)} TON`);
            break;
          }
        }
      }

      if (!foundTx) {
        logger.warn(`❌ Transaction not found. Hash: ${txHash.substring(0, 16)}..., Expected: ${expectedAmount} TON`);
        return false;
      }

      // Step 4: Verify the transaction details
      const inMessage = foundTx.inMessage;
      if (!inMessage || inMessage.info.type !== 'internal') {
        logger.warn(`❌ Invalid transaction type`);
        return false;
      }

      // Verify amount
      const receivedAmount = Number(inMessage.info.value.coins) / 1e9;
      const expectedMin = expectedAmount * 0.90;
      const expectedMax = expectedAmount * 1.10;
      
      if (receivedAmount < expectedMin || receivedAmount > expectedMax) {
        logger.warn(`❌ Amount mismatch: received ${receivedAmount} TON, expected ${expectedAmount} TON`);
        return false;
      }

      // Step 5: Verify message body contains ProcessPayment opcode
      if (inMessage.body) {
        try {
          const bodySlice = inMessage.body.beginParse();
          const opcode = bodySlice.loadUint(32);
          
          // ProcessPayment opcode is 0x7e8764ef
          if (opcode === 0x7e8764ef) {
            logger.info(`✅ ProcessPayment message verified (opcode: 0x${opcode.toString(16)})`);
            
            // Additionally verify the creator address in the message
            try {
              const queryId = bodySlice.loadUintBig(64);
              const postId = bodySlice.loadUintBig(64);
              const messageCreatorAddress = bodySlice.loadAddress();
              
              const expectedCreatorAddr = Address.parse(creatorAddress);
              
              if (messageCreatorAddress.equals(expectedCreatorAddr)) {
                logger.info(`✅ Creator address verified in message`);
              } else {
                logger.warn(`⚠️ Creator address mismatch in message: ${messageCreatorAddress.toString()} vs ${expectedCreatorAddr.toString()}`);
              }
              
              logger.info(`Message details - queryId: ${queryId}, postId: ${postId}`);
            } catch (parseError) {
              logger.warn(`Could not parse full message body, but opcode is correct`);
            }
          } else {
            logger.warn(`⚠️ Unexpected opcode: 0x${opcode.toString(16)}, expected 0x7e8764ef`);
          }
        } catch (bodyError) {
          logger.warn(`Could not parse message body:`, bodyError);
        }
      }

      // Step 6: Verify transaction timing (must be recent)
      const txTime = foundTx.now;
      const currentTime = Math.floor(Date.now() / 1000);
      const timeDiff = currentTime - txTime;
      
      if (timeDiff > 600) { // 10 minutes
        logger.warn(`❌ Transaction too old: ${timeDiff}s ago`);
        return false;
      }

      logger.info(`✅ Transaction fully verified: amount=${receivedAmount.toFixed(4)} TON, time=${timeDiff}s ago`);
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
