import { Router, Request, Response } from 'express';
import User from '../models/User';
import Channel from '../models/Channel';
import Post from '../models/Post';
import { logger } from '../utils/logger';
import { generateId } from '../utils/helpers';
import { tappBot } from '../bot/index';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Get creator profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    let user = await User.findOne({ telegramId: userId as string });

    if (!user) {
      // Create user if doesn't exist
      user = await User.create({
        telegramId: userId as string,
        isCreator: false,
      });
    }

    res.json({
      telegramId: user.telegramId,
      walletAddress: user.walletAddress,
      isCreator: user.isCreator,
      totalEarned: user.totalEarned,
    });
  } catch (error) {
    logger.error('Error fetching creator profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update/set wallet address
router.post('/wallet', async (req: Request, res: Response) => {
  try {
    const { userId, walletAddress } = req.body;

    if (!userId || !walletAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await User.findOneAndUpdate(
      { telegramId: userId },
      { 
        walletAddress,
        isCreator: true // Mark as creator when they set wallet
      },
      { upsert: true, new: true }
    );

    logger.info(`Wallet address updated for user ${userId}: ${walletAddress}`);

    res.json({ success: true, walletAddress: user.walletAddress });
  } catch (error) {
    logger.error('Error updating wallet:', error);
    res.status(500).json({ error: 'Failed to update wallet' });
  }
});

// Get creator's channels
router.get('/channels', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const channels = await Channel.find({ 
      creatorId: userId as string,
      isActive: true 
    });

    res.json(channels);
  } catch (error) {
    logger.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Get creator stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const posts = await Post.find({ creatorId: userId as string });

    const stats = {
      totalPosts: posts.length,
      totalEarnings: posts.reduce((sum, post) => sum + post.totalEarnings, 0),
      totalViews: posts.reduce((sum, post) => sum + post.views, 0),
      totalPurchases: posts.reduce((sum, post) => sum + post.purchases, 0),
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get creator's posts
router.get('/posts', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const posts = await Post.find({ creatorId: userId as string })
      .sort({ createdAt: -1 });

    const postsWithChannel = await Promise.all(posts.map(async (post) => {
      const channel = await Channel.findOne({ channelId: post.channelId });
      return {
        postId: post.postId,
        channelTitle: channel?.channelTitle || 'Unknown Channel',
        teaserText: post.teaserText,
        price: post.price,
        views: post.views,
        purchases: post.purchases,
        totalEarnings: post.totalEarnings,
        isActive: post.isActive,
        createdAt: post.createdAt,
      };
    }));

    res.json(postsWithChannel);
  } catch (error) {
    logger.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create new post
router.post('/posts', upload.fields([
  { name: 'preview', maxCount: 1 },
  { name: 'content', maxCount: 1 }
]), async (req: Request, res: Response) => {
  try {
    const { 
      userId, 
      channelId, 
      channelTitle, 
      price, 
      teaserText, 
      walletAddress,
      contentType,
      contentData 
    } = req.body;

    if (!userId || !channelId || !price || !teaserText) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const previewFile = files?.preview?.[0];
    const contentFile = files?.content?.[0];

    const postId = generateId('post');

    // Get the bot instance
    const bot = tappBot.getBot();

    // Create the web app URL for unlocking
    const webAppUrl = `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}/myapp?startapp=${postId}`;

    // Prepare the teaser message
    const caption = `🔒 *Premium Content*\n\n${teaserText}\n\n💎 Price: ${price} TON`;
    
    try {
      let teaserMessage;

      // Post to Telegram channel
      if (previewFile) {
        // If there's a preview file, send it as photo/video/document
        const filePath = path.join(__dirname, '../../uploads', previewFile.filename);
        
        try {
          // Try as photo first
          teaserMessage = await bot.telegram.sendPhoto(
            channelId,
            { source: filePath },
            {
              caption,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[
                  { text: '🔓 Unlock Now', url: webAppUrl }
                ]]
              }
            }
          );
        } catch (photoError) {
          // If not a photo, try as document
          teaserMessage = await bot.telegram.sendDocument(
            channelId,
            { source: filePath },
            {
              caption,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[
                  { text: '🔓 Unlock Now', url: webAppUrl }
                ]]
              }
            }
          );
        }
      } else {
        // No preview, just send text
        teaserMessage = await bot.telegram.sendMessage(
          channelId,
          caption,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '🔓 Unlock Now', url: webAppUrl }
              ]]
            }
          }
        );
      }

      // Now create the post in database with the message ID
      const post = await Post.create({
        postId,
        channelId,
        creatorId: userId,
        creatorWalletAddress: walletAddress,
        teaserMessageId: teaserMessage.message_id,
        price: parseFloat(price),
        currency: 'TON',
        teaserText,
        previewFileId: previewFile?.filename,
        contentType: contentType || 'text',
        contentData: contentData || '',
        fileId: contentFile?.filename,
        fileName: contentFile?.originalname,
      });

      // Update channel stats
      await Channel.findOneAndUpdate(
        { channelId },
        { $inc: { totalPosts: 1 } }
      );

      logger.info(`Post created and published: ${postId} by user ${userId}`);

      res.json({ 
        success: true, 
        postId,
        message: 'Post created and published successfully' 
      });
    } catch (telegramError) {
      logger.error('Error posting to Telegram:', telegramError);
      res.status(500).json({ error: 'Failed to publish post to channel' });
    }
  } catch (error) {
    logger.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Deactivate post
router.post('/posts/:postId/deactivate', async (req: Request, res: Response) => {
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

    logger.info(`Post deactivated: ${postId}`);

    res.json({ success: true, message: 'Post deactivated' });
  } catch (error) {
    logger.error('Error deactivating post:', error);
    res.status(500).json({ error: 'Failed to deactivate post' });
  }
});

export default router;
