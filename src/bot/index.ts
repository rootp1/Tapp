import { Telegraf, Context, Markup } from 'telegraf';
import { Update } from 'telegraf/typings/core/types/typegram';
import { logger } from '../utils/logger';
import { connectDatabase } from '../config/database';
import User from '../models/User';
import Channel from '../models/Channel';
import Post from '../models/Post';
import { generateId } from '../utils/helpers';
import { BOT_COMMANDS, MIN_POST_PRICE, MAX_POST_PRICE } from '../config/constants';

// Session data interface
interface SessionData {
  step?: string;
  postData?: {
    channelId?: string;
    channelTitle?: string;
    price?: number;
    teaserText?: string;
    contentType?: string;
    contentData?: string;
    fileId?: string;
    fileName?: string;
  };
}

// Extended context with session
interface BotContext extends Context {
  session?: SessionData;
}

const sessions = new Map<string, SessionData>();

class TappBot {
  private bot: Telegraf<BotContext>;

  constructor(token: string) {
    this.bot = new Telegraf<BotContext>(token);
    this.setupMiddleware();
    this.setupCommands();
    this.setupHandlers();
  }

  private setupMiddleware() {
    // Session middleware
    this.bot.use((ctx, next) => {
      const userId = ctx.from?.id.toString();
      if (userId) {
        if (!sessions.has(userId)) {
          sessions.set(userId, {});
        }
        ctx.session = sessions.get(userId);
      }
      return next();
    });

    // User registration middleware
    this.bot.use(async (ctx, next) => {
      if (ctx.from) {
        await this.ensureUser(ctx.from.id.toString(), ctx.from);
      }
      return next();
    });
  }

  private setupCommands() {
    // Start command
    this.bot.command('start', async (ctx) => {
      const webAppUrl = process.env.WEBAPP_URL || 'https://your-domain.com/webapp';

      await ctx.reply(
        `Welcome to Tapp! 🚀\n\n` +
        `Monetize your Telegram posts with TON payments.\n\n` +
        `🎨 *For Creators:*\n` +
        `• Create premium posts with /createpost\n` +
        `• Add me as admin to your channel\n` +
        `• Set prices and earn 95% of payments\n\n` +
        `💎 *For Users:*\n` +
        `• Unlock premium content with TON\n` +
        `• Instant access after payment\n` +
        `• Secure and transparent\n\n` +
        `Get started now!`,
        { parse_mode: 'Markdown' }
      );
    });

    // Help command
    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        `*Available Commands:*\n\n` +
        `${BOT_COMMANDS.CREATE_POST} - Create a new premium post\n` +
        `${BOT_COMMANDS.MY_CHANNELS} - View your channels\n` +
        `${BOT_COMMANDS.EARNINGS} - Check your earnings\n` +
        `${BOT_COMMANDS.STATS} - View post statistics\n` +
        `${BOT_COMMANDS.CANCEL} - Cancel current operation\n\n` +
        `*How to create a post:*\n` +
        `1. Add this bot as admin to your channel\n` +
        `2. Use ${BOT_COMMANDS.CREATE_POST} to start\n` +
        `3. Follow the steps to set price and content\n` +
        `4. Bot will post teaser with unlock button`,
        { parse_mode: 'Markdown' }
      );
    });

    // Create post command
    this.bot.command('createpost', async (ctx) => {
      await this.startPostCreation(ctx);
    });

    // My channels command
    this.bot.command('mychannels', async (ctx) => {
      await this.showMyChannels(ctx);
    });

    // Earnings command
    this.bot.command('earnings', async (ctx) => {
      await this.showEarnings(ctx);
    });

    // Stats command
    this.bot.command('stats', async (ctx) => {
      await this.showStats(ctx);
    });

    // Cancel command
    this.bot.command('cancel', async (ctx) => {
      const userId = ctx.from?.id.toString();
      if (userId) {
        sessions.delete(userId);
      }
      await ctx.reply('Operation cancelled.');
    });
  }

  private setupHandlers() {
    // Handle callback queries (button clicks)
    this.bot.on('callback_query', async (ctx) => {
      if (!('data' in ctx.callbackQuery)) return;
      const data = ctx.callbackQuery.data;

      if (data?.startsWith('unlock_')) {
        const postId = data.replace('unlock_', '');
        await this.handleUnlockRequest(ctx, postId);
      } else if (data?.startsWith('channel_')) {
        const channelId = data.replace('channel_', '');
        await this.selectChannel(ctx, channelId);
      } else if (data === 'confirm_post') {
        await this.confirmPost(ctx);
      } else if (data === 'cancel_post') {
        const userId = ctx.from?.id.toString();
        if (userId) {
          sessions.delete(userId);
        }
        await ctx.editMessageText('Post creation cancelled.');
      }

      await ctx.answerCbQuery();
    });

    // Handle messages based on session state
    this.bot.on('message', async (ctx) => {
      const session = ctx.session;
      if (!session?.step) return;

      switch (session.step) {
        case 'awaiting_price':
          await this.handlePriceInput(ctx);
          break;
        case 'awaiting_teaser':
          await this.handleTeaserInput(ctx);
          break;
        case 'awaiting_content':
          await this.handleContentInput(ctx);
          break;
      }
    });

    // Handle channel/group posts
    this.bot.on('my_chat_member', async (ctx) => {
      const chat = ctx.chat;
      const newStatus = ctx.myChatMember.new_chat_member.status;

      if (chat.type === 'channel' && newStatus === 'administrator') {
        await this.handleChannelAdded(ctx, chat);
      }
    });
  }

  // Helper methods
  private async ensureUser(telegramId: string, userData: any) {
    try {
      let user = await User.findOne({ telegramId });

      if (!user) {
        user = await User.create({
          telegramId,
          username: userData.username,
          firstName: userData.first_name,
          lastName: userData.last_name,
        });
        logger.info(`New user created: ${telegramId}`);
      }

      return user;
    } catch (error) {
      logger.error('Error ensuring user:', error);
    }
  }

  private async handleChannelAdded(ctx: BotContext, chat: any) {
    try {
      const userId = ctx.from?.id.toString();
      if (!userId) return;

      const channel = await Channel.create({
        channelId: chat.id.toString(),
        channelUsername: chat.username,
        channelTitle: chat.title,
        creatorId: userId,
      });

      // Mark user as creator
      await User.findOneAndUpdate(
        { telegramId: userId },
        { isCreator: true }
      );

      await ctx.reply(
        `Channel "${chat.title}" added successfully! 🎉\n\n` +
        `You can now create premium posts for this channel using ${BOT_COMMANDS.CREATE_POST}`
      );

      logger.info(`Channel added: ${chat.id} by user ${userId}`);
    } catch (error) {
      logger.error('Error handling channel added:', error);
    }
  }

  private async startPostCreation(ctx: BotContext) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const channels = await Channel.find({ creatorId: userId, isActive: true });

    if (channels.length === 0) {
      await ctx.reply(
        'You need to add this bot as admin to your channel first.\n\n' +
        '1. Go to your channel\n' +
        '2. Add this bot as administrator\n' +
        '3. Grant "Post Messages" permission\n' +
        '4. Come back and use /createpost again'
      );
      return;
    }

    const buttons = channels.map((channel) =>
      Markup.button.callback(channel.channelTitle, `channel_${channel.channelId}`)
    );

    await ctx.reply(
      'Select a channel to create a post:',
      Markup.inlineKeyboard(buttons, { columns: 1 })
    );
  }

  private async selectChannel(ctx: BotContext, channelId: string) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const channel = await Channel.findOne({ channelId, creatorId: userId });
    if (!channel) {
      await ctx.editMessageText('Channel not found.');
      return;
    }

    if (ctx.session) {
      ctx.session.step = 'awaiting_price';
      ctx.session.postData = {
        channelId,
        channelTitle: channel.channelTitle,
      };
    }

    await ctx.editMessageText(
      `Creating post for: *${channel.channelTitle}*\n\n` +
      `Enter the price in TON (min: ${MIN_POST_PRICE}, max: ${MAX_POST_PRICE}):`,
      { parse_mode: 'Markdown' }
    );
  }

  private async handlePriceInput(ctx: BotContext) {
    const text = (ctx.message as any)?.text;
    const price = parseFloat(text);

    if (isNaN(price) || price < MIN_POST_PRICE || price > MAX_POST_PRICE) {
      await ctx.reply(
        `Invalid price. Please enter a number between ${MIN_POST_PRICE} and ${MAX_POST_PRICE} TON.`
      );
      return;
    }

    if (ctx.session?.postData) {
      ctx.session.postData.price = price;
      ctx.session.step = 'awaiting_teaser';
    }

    await ctx.reply(
      `Price set to ${price} TON ✅\n\n` +
      `Now send a teaser text (what users will see before unlocking):`
    );
  }

  private async handleTeaserInput(ctx: BotContext) {
    const text = (ctx.message as any)?.text;

    if (!text || text.length < 10) {
      await ctx.reply('Teaser text must be at least 10 characters.');
      return;
    }

    if (ctx.session?.postData) {
      ctx.session.postData.teaserText = text;
      ctx.session.step = 'awaiting_content';
    }

    await ctx.reply(
      `Teaser saved! ✅\n\n` +
      `Now send the premium content (text, photo, video, or document):`
    );
  }

  private async handleContentInput(ctx: BotContext) {
    const message = ctx.message as any;
    let contentType = 'text';
    let contentData = '';
    let fileId = '';
    let fileName = '';

    if (message.text) {
      contentType = 'text';
      contentData = message.text;
    } else if (message.photo) {
      contentType = 'photo';
      fileId = message.photo[message.photo.length - 1].file_id;
      contentData = message.caption || '';
    } else if (message.video) {
      contentType = 'video';
      fileId = message.video.file_id;
      contentData = message.caption || '';
      fileName = message.video.file_name || '';
    } else if (message.document) {
      contentType = 'document';
      fileId = message.document.file_id;
      fileName = message.document.file_name || '';
      contentData = message.caption || '';
    } else if (message.audio) {
      contentType = 'audio';
      fileId = message.audio.file_id;
      fileName = message.audio.file_name || '';
      contentData = message.caption || '';
    } else {
      await ctx.reply('Unsupported content type. Please send text, photo, video, or document.');
      return;
    }

    if (ctx.session?.postData) {
      ctx.session.postData.contentType = contentType;
      ctx.session.postData.contentData = contentData;
      ctx.session.postData.fileId = fileId;
      ctx.session.postData.fileName = fileName;
      ctx.session.step = 'confirming';
    }

    const postData = ctx.session?.postData;
    await ctx.reply(
      `*Post Preview:*\n\n` +
      `Channel: ${postData?.channelTitle}\n` +
      `Price: ${postData?.price} TON\n` +
      `Teaser: ${postData?.teaserText}\n` +
      `Content Type: ${contentType}\n\n` +
      `Confirm to publish?`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.callback('✅ Confirm', 'confirm_post'),
          Markup.button.callback('❌ Cancel', 'cancel_post'),
        ]),
      }
    );
  }

  private async confirmPost(ctx: BotContext) {
    const userId = ctx.from?.id.toString();
    const postData = ctx.session?.postData;

    if (!userId || !postData || !postData.channelId) {
      await ctx.editMessageText('Error creating post. Please try again.');
      return;
    }

    try {
      // Create post in database
      const postId = generateId('post');

      // Send teaser message to channel
      // Use the bot's WebApp short name from BotFather
      const webAppUrl = `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}/myapp?startapp=${postId}`;
      
      logger.info(`Creating post with unlock URL: ${webAppUrl}`);

      const teaserMessage = await this.bot.telegram.sendMessage(
        postData.channelId,
        `🔒 *Premium Content*\n\n${postData.teaserText}\n\n💎 Price: ${postData.price} TON`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            Markup.button.url('🔓 Unlock Now', webAppUrl),
          ]),
        }
      );

      // Save post to database
      await Post.create({
        postId,
        channelId: postData.channelId,
        creatorId: userId,
        teaserMessageId: teaserMessage.message_id,
        price: postData.price,
        currency: 'TON',
        teaserText: postData.teaserText || '',
        contentType: postData.contentType,
        contentData: postData.contentData || '',
        fileId: postData.fileId,
        fileName: postData.fileName,
      });

      // Update channel stats
      await Channel.findOneAndUpdate(
        { channelId: postData.channelId },
        { $inc: { totalPosts: 1 } }
      );

      await ctx.editMessageText(
        `Post published successfully! 🎉\n\n` +
        `Your premium post is now live in ${postData.channelTitle}.`
      );

      // Clear session
      if (userId) {
        sessions.delete(userId);
      }

      logger.info(`Post created: ${postId} by user ${userId}`);
    } catch (error) {
      logger.error('Error confirming post:', error);
      await ctx.editMessageText('Error publishing post. Please try again.');
    }
  }

  private async handleUnlockRequest(ctx: BotContext, postId: string) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    // This will be handled by the web app
    await ctx.answerCbQuery('Opening payment interface...');
  }

  private async showMyChannels(ctx: BotContext) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const channels = await Channel.find({ creatorId: userId });

    if (channels.length === 0) {
      await ctx.reply('You have no channels added yet.');
      return;
    }

    let message = '*Your Channels:*\n\n';
    for (const channel of channels) {
      message += `📢 ${channel.channelTitle}\n`;
      message += `   Posts: ${channel.totalPosts}\n`;
      message += `   Earnings: ${channel.totalEarnings.toFixed(2)} TON\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  private async showEarnings(ctx: BotContext) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const user = await User.findOne({ telegramId: userId });
    if (!user) return;

    await ctx.reply(
      `*Your Earnings:*\n\n` +
      `💰 Total Earned: ${user.totalEarned.toFixed(2)} TON\n` +
      `💸 Platform keeps 5%, you get 95%`,
      { parse_mode: 'Markdown' }
    );
  }

  private async showStats(ctx: BotContext) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const posts = await Post.find({ creatorId: userId });

    if (posts.length === 0) {
      await ctx.reply('You have no posts yet.');
      return;
    }

    const totalViews = posts.reduce((sum, post) => sum + post.views, 0);
    const totalPurchases = posts.reduce((sum, post) => sum + post.purchases, 0);
    const totalEarnings = posts.reduce((sum, post) => sum + post.totalEarnings, 0);

    await ctx.reply(
      `*Your Statistics:*\n\n` +
      `📊 Total Posts: ${posts.length}\n` +
      `👁 Total Views: ${totalViews}\n` +
      `💎 Total Purchases: ${totalPurchases}\n` +
      `💰 Total Earnings: ${totalEarnings.toFixed(2)} TON`,
      { parse_mode: 'Markdown' }
    );
  }

  async deliverContent(userId: string, postId: string) {
    try {
      const post = await Post.findOne({ postId });
      if (!post) {
        logger.error(`Post not found: ${postId}`);
        return;
      }

      const message = `🎉 *Content Unlocked!*\n\n`;

      if (post.contentType === 'text') {
        await this.bot.telegram.sendMessage(userId, message + post.contentData, {
          parse_mode: 'Markdown',
        });
      } else if (post.contentType === 'photo' && post.fileId) {
        await this.bot.telegram.sendPhoto(userId, post.fileId, {
          caption: message + (post.contentData || ''),
          parse_mode: 'Markdown',
        });
      } else if (post.contentType === 'video' && post.fileId) {
        await this.bot.telegram.sendVideo(userId, post.fileId, {
          caption: message + (post.contentData || ''),
          parse_mode: 'Markdown',
        });
      } else if (post.contentType === 'document' && post.fileId) {
        await this.bot.telegram.sendDocument(userId, post.fileId, {
          caption: message + (post.contentData || ''),
          parse_mode: 'Markdown',
        });
      } else if (post.contentType === 'audio' && post.fileId) {
        await this.bot.telegram.sendAudio(userId, post.fileId, {
          caption: message + (post.contentData || ''),
          parse_mode: 'Markdown',
        });
      }

      logger.info(`Content delivered to user ${userId} for post ${postId}`);
    } catch (error) {
      logger.error('Error delivering content:', error);
    }
  }

  async launch() {
    try {
      await connectDatabase();
      
      logger.info('Starting Telegram bot...');
      
      // Try to get bot info first as a connectivity test
      const botInfo = await this.bot.telegram.getMe();
      logger.info(`Bot authenticated as: @${botInfo.username}`);
      
      // Launch bot in background - don't await to prevent blocking
      this.bot.launch({
        dropPendingUpdates: true,
        allowedUpdates: ['message', 'callback_query', 'my_chat_member'],
      }).then(() => {
        logger.info('Tapp Bot started successfully');
      }).catch((error) => {
        logger.error('Bot polling error:', error);
      });
      
      // Don't wait for launch to complete
      logger.info('Bot launch initiated in background');

      // Enable graceful stop
      process.once('SIGINT', () => this.bot.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    } catch (error) {
      logger.error('Failed to launch bot:', error);
      throw error;
    }
  }

  async launchWebhook() {
    try {
      await connectDatabase();
      
      logger.info('Starting Telegram bot with webhook...');
      
      // Get bot info with retry logic
      let botInfo: any;
      let retries = 3;
      while (retries > 0) {
        try {
          botInfo = await Promise.race([
            this.bot.telegram.getMe(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('getMe timeout')), 10000)
            )
          ]);
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          logger.warn(`Bot authentication failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      logger.info(`Bot authenticated as: @${botInfo.username}`);
      
      // Get webhook URL from environment
      const webhookDomain = process.env.WEBHOOK_DOMAIN || process.env.WEBAPP_URL?.replace('/webapp', '');
      if (!webhookDomain) {
        throw new Error('WEBHOOK_DOMAIN or WEBAPP_URL is required for webhook mode');
      }
      
      const webhookUrl = `${webhookDomain}/webhook/telegram`;
      
      // Set webhook with timeout
      await Promise.race([
        this.bot.telegram.setWebhook(webhookUrl, {
          drop_pending_updates: true,
          allowed_updates: ['message', 'callback_query', 'my_chat_member'],
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('setWebhook timeout')), 10000)
        )
      ]);
      
      logger.info(`Webhook set to: ${webhookUrl}`);
      logger.info('Tapp Bot webhook started successfully');

      // Enable graceful stop
      process.once('SIGINT', () => this.bot.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    } catch (error) {
      logger.error('Failed to launch bot webhook:', error);
      throw error;
    }
  }

  webhookCallback(path: string) {
    return this.bot.webhookCallback(path);
  }

  getBot() {
    return this.bot;
  }
}

// Initialize and export
const token = process.env.TELEGRAM_BOT_TOKEN || '';
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

export const tappBot = new TappBot(token);

// Run bot if this file is executed directly
if (require.main === module) {
  tappBot.launch();
}
