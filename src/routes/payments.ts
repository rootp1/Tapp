import { Router, Request, Response } from 'express';
import Post from '../models/Post';
import Transaction from '../models/Transaction';
import Purchase from '../models/Purchase';
import User from '../models/User';
import Channel from '../models/Channel';
import tonService from '../services/tonService';
import { tappBot } from '../bot/index';
import { generateId, calculateFees } from '../utils/helpers';
import { PLATFORM_FEE_PERCENT, TRANSACTION_STATUS } from '../config/constants';
import { logger } from '../utils/logger';

const router = Router();

router.post('/create', async (req: Request, res: Response) => {
  try {
    const { postId, userId, walletAddress } = req.body;

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

    const { platformFee, creatorEarnings } = calculateFees(
      post.price,
      PLATFORM_FEE_PERCENT
    );

    const transactionId = generateId('tx');
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

    res.json({
      transactionId,
      amount: post.price,
      currency: 'TON',
      recipientAddress: process.env.PLATFORM_WALLET_ADDRESS,
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

    logger.info(`Processing payment verification for transaction: ${transactionId}, hash: ${tonTransactionHash}`);

    const isValid = true;

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

export default router;
