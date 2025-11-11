import { Router, Request, Response } from 'express';
import User from '../models/User';
import Post from '../models/Post';
import Transaction from '../models/Transaction';
import Channel from '../models/Channel';
import { logger } from '../utils/logger';

const router = Router();

const isAdmin = (req: Request, res: Response, next: Function) => {
  const adminIds = process.env.ADMIN_TELEGRAM_IDS?.split(',') || [];
  const userId = req.query.adminId as string;

  if (!userId || !adminIds.includes(userId)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  next();
};

router.get('/stats', isAdmin, async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCreators = await User.countDocuments({ isCreator: true });
    const totalPosts = await Post.countDocuments();
    const totalChannels = await Channel.countDocuments();

    const transactions = await Transaction.find({ status: 'completed' });
    const totalRevenue = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const platformRevenue = transactions.reduce(
      (sum, tx) => sum + tx.platformFee,
      0
    );

    res.json({
      users: {
        total: totalUsers,
        creators: totalCreators,
      },
      content: {
        posts: totalPosts,
        channels: totalChannels,
      },
      revenue: {
        total: totalRevenue,
        platform: platformRevenue,
        creators: totalRevenue - platformRevenue,
      },
      transactions: {
        total: transactions.length,
        pending: await Transaction.countDocuments({ status: 'pending' }),
        completed: await Transaction.countDocuments({ status: 'completed' }),
        failed: await Transaction.countDocuments({ status: 'failed' }),
      },
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/transactions', isAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const transactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ transactions });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/verify-creator/:userId', isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findOneAndUpdate(
      { telegramId: userId },
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    logger.error('Error verifying creator:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/posts/:postId/deactivate', isAdmin, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const post = await Post.findOneAndUpdate(
      { postId },
      { isActive: false },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ success: true, post });
  } catch (error) {
    logger.error('Error deactivating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
