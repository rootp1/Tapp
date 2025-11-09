import { Address } from '@ton/core';
import { logger } from '../utils/logger';
import axios from 'axios';

interface TonTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
}

class TonService {
  private apiEndpoint: string;
  private apiKey: string;

  constructor() {
    this.apiEndpoint = process.env.TON_NETWORK === 'mainnet'
      ? 'https://toncenter.com/api/v2'
      : 'https://testnet.toncenter.com/api/v2';
    this.apiKey = process.env.TON_API_KEY || '';
  }

  /**
   * Verify a TON transaction
   */
  async verifyTransaction(
    hash: string,
    expectedAmount: number,
    recipientAddress: string
  ): Promise<boolean> {
    try {
      const transaction = await this.getTransaction(hash);

      if (!transaction) {
        logger.warn(`Transaction not found: ${hash}`);
        return false;
      }

      // Verify recipient
      if (transaction.to.toLowerCase() !== recipientAddress.toLowerCase()) {
        logger.warn(`Transaction recipient mismatch. Expected: ${recipientAddress}, Got: ${transaction.to}`);
        return false;
      }

      // Verify amount (convert from nanoTON to TON)
      const actualAmount = parseInt(transaction.value) / 1e9;
      if (actualAmount < expectedAmount) {
        logger.warn(`Transaction amount mismatch. Expected: ${expectedAmount}, Got: ${actualAmount}`);
        return false;
      }

      logger.info(`Transaction verified successfully: ${hash}`);
      return true;
    } catch (error) {
      logger.error('Error verifying transaction:', error);
      return false;
    }
  }

  /**
   * Get transaction details from TON network
   */
  private async getTransaction(hash: string): Promise<TonTransaction | null> {
    try {
      const response = await axios.get(`${this.apiEndpoint}/getTransactions`, {
        params: {
          hash,
          api_key: this.apiKey,
        },
      });

      if (response.data && response.data.result && response.data.result.length > 0) {
        const tx = response.data.result[0];
        return {
          hash: tx.transaction_id?.hash || hash,
          from: tx.in_msg?.source || '',
          to: tx.in_msg?.destination || '',
          value: tx.in_msg?.value || '0',
          timestamp: tx.utime || 0,
        };
      }

      return null;
    } catch (error) {
      logger.error('Error fetching transaction:', error);
      return null;
    }
  }

  /**
   * Validate TON address
   */
  isValidAddress(address: string): boolean {
    try {
      Address.parse(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert TON to nanoTON
   */
  toNano(amount: number): string {
    return (amount * 1e9).toString();
  }

  /**
   * Convert nanoTON to TON
   */
  fromNano(nanoAmount: string): number {
    return parseInt(nanoAmount) / 1e9;
  }
}

export default new TonService();
