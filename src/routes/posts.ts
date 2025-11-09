import { Router, Request, Response } from 'express';
import Post from '../models/Post';
import Purchase from '../models/Purchase';
import { logger } from '../utils/logger';

const router = Router();

// Get post details
router.get('/:postId', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.query.userId as string;

    const post = await Post.findOne({ postId, isActive: true });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Increment views
    await Post.findOneAndUpdate({ postId }, { $inc: { views: 1 } });

    // Check if user already purchased
    let hasPurchased = false;
    if (userId) {
      const purchase = await Purchase.findOne({ userId, postId });
      hasPurchased = !!purchase;
    }

    res.json({
      postId: post.postId,
      price: post.price,
      currency: post.currency,
      teaserText: post.teaserText,
      contentType: post.contentType,
      hasPurchased,
      views: post.views,
      purchases: post.purchases,
    });
  } catch (error) {
    logger.error('Error fetching post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's purchased posts
router.get('/user/:userId/purchases', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const purchases = await Purchase.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const postIds = purchases.map((p) => p.postId);
    const posts = await Post.find({ postId: { $in: postIds } });

    res.json({
      purchases: purchases.map((purchase) => {
        const post = posts.find((p) => p.postId === purchase.postId);
        return {
          postId: purchase.postId,
          transactionId: purchase.transactionId,
          purchaseDate: purchase.purchaseDate,
          post: post
            ? {
                price: post.price,
                teaserText: post.teaserText,
                contentType: post.contentType,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    logger.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
