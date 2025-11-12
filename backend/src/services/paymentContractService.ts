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
    creatorAddress: string,
    amount: bigint
  ): string {
    const creator = Address.parse(creatorAddress);

    const body = beginCell()
      .storeUint(0x7e8764ef, 32)  // ProcessPayment opcode
      .storeUint(queryId, 64)
      .storeUint(postId, 64)
      .storeAddress(creator)
      .storeCoins(amount)
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
  }> {
    if (!this.contract) {
      throw new Error('Payment contract not initialized');
    }

    try {
      // OpenedContract automatically provides the provider
      const totalProcessed = await this.contract.getTotalProcessed();
      const platformAddress = await this.contract.getPlatformAddress();
      const platformFeePercent = await this.contract.getPlatformFeePercent();

      return {
        totalProcessed,
        platformAddress: platformAddress.toString(),
        platformFeePercent,
      };
    } catch (error) {
      logger.error('Error getting contract stats:', error);
      throw error;
    }
  }

  /**
   * Verify a transaction to the payment contract
   * Retries multiple times to give the transaction time to appear on-chain
   * @returns Object with verification status and transaction hash
   */
  async verifyPaymentTransaction(
    txBoc: string,
    expectedAmount: number,
    creatorAddress: string,
    buyerWalletAddress?: string,
    maxRetries: number = 10,
    retryDelayMs: number = 3000
  ): Promise<{ verified: boolean; txHash?: string; postId?: string; sender?: string }> {
    try {
      if (!this.contractAddress) {
        throw new Error('Contract not initialized');
      }

      logger.info(`Verifying payment: amount=${expectedAmount} TON, creator=${creatorAddress.substring(0, 10)}...${buyerWalletAddress ? `, buyer=${buyerWalletAddress.substring(0, 10)}...` : ''}`);

      // Calculate expected range once
      const expectedMin = expectedAmount * 0.90;
      const expectedMax = expectedAmount * 1.10;
      
      // Parse buyer address if provided
      const expectedBuyerAddr = buyerWalletAddress ? Address.parse(buyerWalletAddress) : null;

      // Retry logic: transaction might not appear immediately
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logger.info(`Verification attempt ${attempt}/${maxRetries}`);

        // Get recent transactions from the contract
        const transactions = await this.client.getTransactions(this.contractAddress, { limit: 50 });
        logger.info(`Checking ${transactions.length} recent transactions on contract ${this.contractAddress.toString()}`);

        const currentTime = Math.floor(Date.now() / 1000);

        for (const tx of transactions) {
          const inMessage = tx.inMessage;
          if (!inMessage || inMessage.info.type !== 'internal') {
            continue;
          }

          const receivedAmount = Number(inMessage.info.value.coins) / 1e9;
          const txTime = tx.now;
          const timeDiff = currentTime - txTime;
          const txHash = tx.hash().toString('hex');
          
          // Get the sender address (who paid)
          const senderAddress = inMessage.info.src;
          const senderStr = senderAddress?.toString() || 'unknown';
          
          logger.info(`TX: hash=${txHash.substring(0, 16)}..., amount=${receivedAmount.toFixed(4)} TON, time=${timeDiff}s ago, from=${senderStr.substring(0, 10)}...`);
          
          // Verify sender if buyer wallet address is provided
          if (expectedBuyerAddr && senderAddress) {
            if (!senderAddress.equals(expectedBuyerAddr)) {
              logger.warn(`Sender mismatch: expected ${expectedBuyerAddr.toString()}, got ${senderAddress.toString()}`);
              continue; // Skip this transaction
            }
            logger.info(`✅ Sender verified: ${senderStr.substring(0, 10)}...`);
          }
          
          // Check amount and timing
          if (receivedAmount >= expectedMin && receivedAmount <= expectedMax && timeDiff < 600) {
            
            // Verify message body contains ProcessPayment opcode and creator address
            if (inMessage.body) {
              try {
                const bodySlice = inMessage.body.beginParse();
                const opcode = bodySlice.loadUint(32);
                
                // ProcessPayment opcode is 0x7e8764ef
                if (opcode === 0x7e8764ef) {
                  logger.info(`Found ProcessPayment message (opcode: 0x${opcode.toString(16)})`);
                  
                  try {
                    const queryId = bodySlice.loadUintBig(64);
                    const postId = bodySlice.loadUintBig(64);
                    const messageCreatorAddress = bodySlice.loadAddress();
                    
                    const expectedCreatorAddr = Address.parse(creatorAddress);
                    
                    // Verify creator address matches
                    if (messageCreatorAddress.equals(expectedCreatorAddr)) {
                      logger.info(`✅ Transaction verified! Hash: ${txHash.substring(0, 16)}..., Amount: ${receivedAmount.toFixed(4)} TON, Time: ${timeDiff}s ago, Sender: ${senderStr.substring(0, 10)}...`);
                      logger.info(`Message details - queryId: ${queryId}, postId: ${postId}, creator: ${messageCreatorAddress.toString()}`);
                      return { 
                        verified: true, 
                        txHash: txHash,
                        postId: postId.toString(),
                        sender: senderStr
                      };
                    } else {
                      logger.warn(`Creator address mismatch: expected ${expectedCreatorAddr.toString()}, got ${messageCreatorAddress.toString()}`);
                    }
                  } catch (parseError) {
                    logger.warn(`Could not parse message body fully:`, parseError);
                    // If we can't parse but opcode matches and amount/time are correct, accept it
                    logger.info(`✅ Transaction verified by opcode and amount (hash: ${txHash.substring(0, 16)}...)`);
                    return { 
                      verified: true, 
                      txHash: txHash,
                      sender: senderStr
                    };
                  }
                }
              } catch (bodyError) {
                logger.warn(`Could not parse message body for tx ${txHash.substring(0, 16)}...`);
              }
            }
          }
        }

        // If not found in this attempt, wait before retry
        if (attempt < maxRetries) {
          logger.info(`Transaction not found yet, waiting ${retryDelayMs}ms before retry ${attempt + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        }
      }

      logger.warn(`❌ Transaction not found after ${maxRetries} attempts. Expected: ${expectedAmount} TON (${expectedMin.toFixed(4)} - ${expectedMax.toFixed(4)} TON), Creator: ${creatorAddress.substring(0, 10)}...`);
      logger.warn(`Contract address: ${this.contractAddress.toString()}`);
      return { verified: false };

    } catch (error) {
      logger.error('Error verifying transaction:', error);
      return { verified: false };
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
