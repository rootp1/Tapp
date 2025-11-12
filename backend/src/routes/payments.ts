import { Router, Request, Response } from 'express';
import Post from '../models/Post';
import Transaction from '../models/Transaction';
import Purchase from '../models/Purchase';
import User from '../models/User';
import Channel from '../models/Channel';
import tonService from '../services/tonService';
import paymentContractService from '../services/paymentContractService';
import { tappBot } from '../bot/index';
import { generateId, calculateFees, postIdToUint64 } from '../utils/helpers';
import { PLATFORM_FEE_PERCENT, TRANSACTION_STATUS } from '../config/constants';
import { logger } from '../utils/logger';

const router = Router();

router.post('/create', async (req: Request, res: Response) => {
  try {
    const { postId, userId, walletAddress, creatorAddress } = req.body;

    if (!postId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingPurchase = await Purchase.findOne({ userId, postId });
    if (existingPurchase) {
      return res.status(400).json({ error: 'Already purchased' });
    }

    const post = await Post.findOne({ postId, isActive: true });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Get creator's TON wallet address from post or fallback to user's wallet
    let creatorTonAddress = post.creatorWalletAddress || creatorAddress;
    
    if (!creatorTonAddress) {
      const creator = await User.findOne({ telegramId: post.creatorId });
      creatorTonAddress = creator?.walletAddress;
    }

    if (!creatorTonAddress) {
      return res.status(400).json({ error: 'Creator wallet address not found' });
    }

    const { platformFee, creatorEarnings } = calculateFees(
      post.price,
      PLATFORM_FEE_PERCENT
    );

    const transactionId = generateId('tx');
    const queryId = BigInt(Date.now());

    const transaction = await Transaction.create({
      transactionId,
      postId,
      buyerId: userId,
      creatorId: post.creatorId,
      amount: post.price,
      platformFee,
      creatorEarnings,
      currency: 'TON',
      status: TRANSACTION_STATUS.PENDING,
      walletAddress,
    });

    // Get smart contract address
    const contractAddress = paymentContractService.getContractAddress();

    // Convert postId string to uint64 for smart contract
    const postIdHash = postIdToUint64(postId);

    // Build the ProcessPayment message
    const messageBody = paymentContractService.buildProcessPaymentMessage(
      queryId,
      postIdHash,
      creatorTonAddress
    );

    res.json({
      transactionId,
      amount: post.price,
      currency: 'TON',
      recipientAddress: contractAddress,
      messageBody, // Include the message body for the transaction
      queryId: queryId.toString(),
    });
  } catch (error) {
    logger.error('Error creating payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { transactionId, tonTransactionHash } = req.body;

    if (!transactionId || !tonTransactionHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transaction = await Transaction.findOne({ transactionId });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status === TRANSACTION_STATUS.COMPLETED) {
      return res.status(400).json({ error: 'Transaction already completed' });
    }

    logger.info(`Processing payment verification for transaction: ${transactionId}, hash: ${tonTransactionHash.substring(0, 50)}...`);

    // Get creator's wallet address for verification
    const creator = await User.findOne({ telegramId: transaction.creatorId });
    const creatorAddress = creator?.walletAddress || '';

    // Verify the transaction through the smart contract
    const isValid = await paymentContractService.verifyPaymentTransaction(
      tonTransactionHash,
      transaction.amount,
      creatorAddress
    );

    if (!isValid) {
      await Transaction.findOneAndUpdate(
        { transactionId },
        {
          status: TRANSACTION_STATUS.FAILED,
          tonTransactionHash,
        }
      );

      return res.status(400).json({ error: 'Invalid transaction' });
    }

    // Mark transaction as completed
    transaction.status = TRANSACTION_STATUS.COMPLETED;
    transaction.tonTransactionHash = tonTransactionHash;
    await transaction.save();

    await Purchase.create({
      userId: transaction.buyerId,
      postId: transaction.postId,
      transactionId: transaction.transactionId,
    });

    await Post.findOneAndUpdate(
      { postId: transaction.postId },
      {
        $inc: {
          purchases: 1,
          totalEarnings: transaction.creatorEarnings,
        },
      }
    );

    await User.findOneAndUpdate(
      { telegramId: transaction.buyerId },
      { $inc: { totalSpent: transaction.amount } }
    );

    await User.findOneAndUpdate(
      { telegramId: transaction.creatorId },
      { $inc: { totalEarned: transaction.creatorEarnings } }
    );

    const post = await Post.findOne({ postId: transaction.postId });
    if (post) {
      await Channel.findOneAndUpdate(
        { channelId: post.channelId },
        { $inc: { totalEarnings: transaction.creatorEarnings } }
      );
    }

    await tappBot.deliverContent(transaction.buyerId, transaction.postId);

    res.json({
      success: true,
      message: 'Payment verified. Content delivered.',
    });

    logger.info(`Payment verified: ${transactionId}`);
  } catch (error) {
    logger.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:transactionId/status', async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({ transactionId });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({
      transactionId: transaction.transactionId,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
    });
  } catch (error) {
    logger.error('Error fetching transaction status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get smart contract statistics
router.get('/contract/stats', async (req: Request, res: Response) => {
  try {
    const stats = await paymentContractService.getContractStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching contract stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if contract is ready
router.get('/contract/health', async (req: Request, res: Response) => {
  try {
    const isReady = await paymentContractService.isContractReady();
    res.json({
      ready: isReady,
      address: isReady ? paymentContractService.getContractAddress() : null,
    });
  } catch (error) {
    logger.error('Error checking contract health:', error);
    res.status(500).json({ error: 'Internal server error', ready: false });
  }
});

export default router;
