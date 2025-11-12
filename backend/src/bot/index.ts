import { Telegraf, Context, Markup } from 'telegraf';
import { Update } from 'telegraf/typings/core/types/typegram';
import { logger } from '../utils/logger';
import { connectDatabase } from '../config/database';
import User from '../models/User';
import Channel from '../models/Channel';
import Post from '../models/Post';
import { generateId } from '../utils/helpers';
import { BOT_COMMANDS, MIN_POST_PRICE, MAX_POST_PRICE } from '../config/constants';

interface SessionData {
  step?: string;
  postData?: {
    channelId?: string;
    channelTitle?: string;
    price?: number;
    teaserText?: string;
    previewFileId?: string;
    contentType?: string;
    contentData?: string;
    fileId?: string;
    fileName?: string;
  };
  walletSetup?: {
    isCreator?: boolean;
  };
}

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

    this.bot.use(async (ctx, next) => {
      if (ctx.from) {
        await this.ensureUser(ctx.from.id.toString(), ctx.from);
      }
      return next();
    });
  }

  private setupCommands() {

    this.bot.command('start', async (ctx) => {
      const args = ctx.message.text.split(' ');
      const startParam = args[1]; // e.g., "creator" if sent as /start creator
      
      await ctx.reply(
        '```\n' +
        '╭───────────────╮\n' +
        '  T    A    P P\n' +
        '  T   A A   P P\n' +
        '  T  AAAAA  P P\n' +
        '  T A     A P P\n' +
        '╰───────────────╯\n' +
        '```\n\n' +
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
      
      // If user indicates they want to be a creator, prompt for wallet
      if (startParam === 'creator') {
        await ctx.reply(
          `📝 *Creator Setup*\n\n` +
          `To receive payments, you need to provide your TON wallet address.\n\n` +
          `Please send your TON wallet address:`,
          { parse_mode: 'Markdown' }
        );
        
        const userId = ctx.from?.id.toString();
        if (userId && ctx.session) {
          ctx.session.step = 'awaiting_wallet_address';
          ctx.session.walletSetup = { isCreator: true };
        }
      }
    });

    this.bot.command('setwallet', async (ctx) => {
      await ctx.reply(
        `📝 *Set Wallet Address*\n\n` +
        `Please send your TON wallet address to receive payments:`,
        { parse_mode: 'Markdown' }
      );
      
      const userId = ctx.from?.id.toString();
      if (userId && ctx.session) {
        ctx.session.step = 'awaiting_wallet_address';
      }
    });

    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        `*Available Commands:*\n\n` +
        `${BOT_COMMANDS.CREATE_POST} - Create a new premium post\n` +
        `${BOT_COMMANDS.MY_CHANNELS} - View your channels\n` +
        `${BOT_COMMANDS.EARNINGS} - Check your earnings\n` +
        `${BOT_COMMANDS.STATS} - View post statistics\n` +
        `${BOT_COMMANDS.STATUS} - Check backend server status\n` +
        `/setwallet - Set your TON wallet address\n` +
        `${BOT_COMMANDS.CANCEL} - Cancel current operation\n\n` +
        `*How to create a post:*\n` +
        `1. Set your wallet address with /setwallet\n` +
        `2. Add this bot as admin to your channel\n` +
        `3. Use ${BOT_COMMANDS.CREATE_POST} to start\n` +
        `4. Follow the steps to set price and content\n` +
        `5. Bot will post teaser with unlock button`,
        { parse_mode: 'Markdown' }
      );
    });

    this.bot.command('createpost', async (ctx) => {
      await this.startPostCreation(ctx);
    });

    this.bot.command('mychannels', async (ctx) => {
      await this.showMyChannels(ctx);
    });

    this.bot.command('earnings', async (ctx) => {
      await this.showEarnings(ctx);
    });

    this.bot.command('stats', async (ctx) => {
      await this.showStats(ctx);
    });

    this.bot.command('cancel', async (ctx) => {
      const userId = ctx.from?.id.toString();
      if (userId) {
        sessions.delete(userId);
      }
      await ctx.reply('Operation cancelled.');
    });

    this.bot.command('status', async (ctx) => {
      await this.checkBackendStatus(ctx);
    });
  }

  private setupHandlers() {

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

    this.bot.on('message', async (ctx) => {
      const session = ctx.session;
      if (!session?.step) return;

      switch (session.step) {
        case 'awaiting_wallet_address':
          await this.handleWalletAddressInput(ctx);
          break;
        case 'awaiting_price':
          await this.handlePriceInput(ctx);
          break;
        case 'awaiting_teaser':
          await this.handleTeaserInput(ctx);
          break;
        case 'awaiting_preview':
          await this.handlePreviewInput(ctx);
          break;
        case 'awaiting_content':
          await this.handleContentInput(ctx);
          break;
      }
    });

    this.bot.on('my_chat_member', async (ctx) => {
      const chat = ctx.chat;
      const newStatus = ctx.myChatMember.new_chat_member.status;

      if (chat.type === 'channel' && newStatus === 'administrator') {
        await this.handleChannelAdded(ctx, chat);
      }
    });
  }

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

      // Check if user has wallet address set
      const user = await User.findOne({ telegramId: userId });
      if (!user?.walletAddress) {
        await ctx.reply(
          `⚠️ *Wallet Address Required*\n\n` +
          `Before adding channels, you need to set your TON wallet address to receive payments.\n\n` +
          `Use /setwallet to set your wallet address.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const channel = await Channel.create({
        channelId: chat.id.toString(),
        channelUsername: chat.username,
        channelTitle: chat.title,
        creatorId: userId,
      });

      await User.findOneAndUpdate(
        { telegramId: userId },
        { isCreator: true }
      );

      await ctx.reply(
        `Channel "${chat.title}" added successfully! 🎉\n\n` +
        `You can now create premium posts for this channel using ${BOT_COMMANDS.CREATE_POST}\n\n` +
        `💰 Payments will be sent to: \`${user.walletAddress}\``,
        { parse_mode: 'Markdown' }
      );

      logger.info(`Channel added: ${chat.id} by user ${userId}`);
    } catch (error) {
      logger.error('Error handling channel added:', error);
    }
  }

  private async handleWalletAddressInput(ctx: BotContext) {
    const text = (ctx.message as any)?.text;
    const userId = ctx.from?.id.toString();
    
    if (!userId || !text) return;

    // Basic validation for TON wallet address
    // TON addresses are base64 strings, typically 48 characters
    const tonAddressRegex = /^[A-Za-z0-9_-]{48}$/;
    const tonAddressWithPrefixRegex = /^(EQ|UQ)[A-Za-z0-9_-]{46}$/;
    
    if (!tonAddressRegex.test(text) && !tonAddressWithPrefixRegex.test(text)) {
      await ctx.reply(
        `❌ Invalid TON wallet address format.\n\n` +
        `Please send a valid TON wallet address (should be 48 characters).`
      );
      return;
    }

    try {
      // Update user's wallet address
      await User.findOneAndUpdate(
        { telegramId: userId },
        { 
          walletAddress: text,
          isCreator: true  // Set as creator when they provide wallet
        },
        { upsert: true }
      );

      await ctx.reply(
        `✅ *Wallet Address Saved!*\n\n` +
        `Your TON wallet address has been set to:\n\`${text}\`\n\n` +
        `You can now:\n` +
        `• Add this bot as admin to your channel\n` +
        `• Create premium posts with ${BOT_COMMANDS.CREATE_POST}\n` +
        `• Receive 95% of all payments directly to your wallet`,
        { parse_mode: 'Markdown' }
      );

      // Clear session
      if (ctx.session) {
        ctx.session.step = undefined;
        ctx.session.walletSetup = undefined;
      }

      logger.info(`Wallet address set for user ${userId}`);
    } catch (error) {
      logger.error('Error setting wallet address:', error);
      await ctx.reply('Error saving wallet address. Please try again.');
    }
  }

  private async startPostCreation(ctx: BotContext) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    // Check if user has wallet address set
    const user = await User.findOne({ telegramId: userId });
    if (!user?.walletAddress) {
      await ctx.reply(
        `⚠️ *Wallet Address Required*\n\n` +
        `Before creating posts, you need to set your TON wallet address to receive payments.\n\n` +
        `Use /setwallet to set your wallet address.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

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
      `💰 Payments will be sent to: \`${user.walletAddress}\`\n\n` +
      'Select a channel to create a post:',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons, { columns: 1 })
      }
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
      ctx.session.step = 'awaiting_preview';
    }

    await ctx.reply(
      `Teaser saved! ✅\n\n` +
      `Now send a preview image/video (optional - this will be shown in the channel):\n\n` +
      `Send a photo, video, or document, OR send /skip to skip preview.`
    );
  }

  private async handlePreviewInput(ctx: BotContext) {
    const message = ctx.message as any;

    if (message.text === '/skip') {
      if (ctx.session) {
        ctx.session.step = 'awaiting_content';
      }
      await ctx.reply(
        `Preview skipped. ✅\n\n` +
        `Now send the premium content (text, photo, video, or document):`
      );
      return;
    }

    let previewFileId = '';

    if (message.photo) {
      previewFileId = message.photo[message.photo.length - 1].file_id;
    } else if (message.video) {
      previewFileId = message.video.file_id;
    } else if (message.document) {
      previewFileId = message.document.file_id;
    } else {
      await ctx.reply('Please send a photo, video, or document for preview, or send /skip to skip.');
      return;
    }

    if (ctx.session?.postData) {
      ctx.session.postData.previewFileId = previewFileId;
      ctx.session.step = 'awaiting_content';
    }

    await ctx.reply(
      `Preview saved! ✅\n\n` +
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
      // Get creator's wallet address
      const creator = await User.findOne({ telegramId: userId });
      if (!creator?.walletAddress) {
        await ctx.editMessageText('Error: Wallet address not found. Please set your wallet with /setwallet');
        return;
      }

      const postId = generateId('post');

      const webAppUrl = `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}/myapp?startapp=${postId}`;

      logger.info(`Creating post with unlock URL: ${webAppUrl}`);

      const caption = `🔒 *Premium Content*\n\n${postData.teaserText}\n\n💎 Price: ${postData.price} TON`;
      const keyboard = Markup.inlineKeyboard([
        Markup.button.url('🔓 Unlock Now', webAppUrl),
      ]);

      let teaserMessage;

      if (postData.previewFileId) {

        try {
          teaserMessage = await this.bot.telegram.sendPhoto(
            postData.channelId,
            postData.previewFileId,
            {
              caption,
              parse_mode: 'Markdown',
              ...keyboard,
            }
          );
        } catch (photoError) {
          try {
            teaserMessage = await this.bot.telegram.sendVideo(
              postData.channelId,
              postData.previewFileId,
              {
                caption,
                parse_mode: 'Markdown',
                ...keyboard,
              }
            );
          } catch (videoError) {
            teaserMessage = await this.bot.telegram.sendDocument(
              postData.channelId,
              postData.previewFileId,
              {
                caption,
                parse_mode: 'Markdown',
                ...keyboard,
              }
            );
          }
        }
      } else {
        teaserMessage = await this.bot.telegram.sendMessage(
          postData.channelId,
          caption,
          {
            parse_mode: 'Markdown',
            ...keyboard,
          }
        );
      }

      await Post.create({
        postId,
        channelId: postData.channelId,
        creatorId: userId,
        creatorWalletAddress: creator.walletAddress,
        teaserMessageId: teaserMessage.message_id,
        price: postData.price,
        currency: 'TON',
        teaserText: postData.teaserText || '',
        previewFileId: postData.previewFileId,
        contentType: postData.contentType,
        contentData: postData.contentData || '',
        fileId: postData.fileId,
        fileName: postData.fileName,
      });

      await Channel.findOneAndUpdate(
        { channelId: postData.channelId },
        { $inc: { totalPosts: 1 } }
      );

      await ctx.editMessageText(
        `Post published successfully! 🎉\n\n` +
        `Your premium post is now live in ${postData.channelTitle}.`
      );

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

    let message = `*Your Earnings:*\n\n` +
      `💰 Total Earned: ${user.totalEarned.toFixed(2)} TON\n` +
      `💸 Platform keeps 5%, you get 95%\n\n`;

    if (user.walletAddress) {
      message += `💳 Wallet: \`${user.walletAddress}\``;
    } else {
      message += `⚠️ No wallet address set. Use /setwallet to add one.`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
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

  private async checkBackendStatus(ctx: BotContext) {
    try {
      await ctx.reply('🔍 Checking backend status...');
      
      const startTime = Date.now();
      const response = await fetch(`${process.env.WEBHOOK_DOMAIN || 'http://localhost:3000'}/health`, {
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json() as { status: string; timestamp: string };
        const statusEmoji = responseTime < 1000 ? '🟢' : responseTime < 3000 ? '🟡' : '🟠';
        
        await ctx.reply(
          `${statusEmoji} *Backend Status: Online*\n\n` +
          `⏱ Response Time: ${responseTime}ms\n` +
          `🕐 Server Time: ${new Date(data.timestamp).toLocaleString()}\n\n` +
          `${responseTime > 3000 ? '⚠️ Server was sleeping but is now awake!' : '✅ All systems operational'}`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply(
          `🔴 *Backend Status: Error*\n\n` +
          `HTTP Status: ${response.status}\n\n` +
          `The backend is experiencing issues. Please try again later or contact support.`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (error) {
      logger.error('Backend status check failed:', error);
      await ctx.reply(
        `🔴 *Backend Status: Offline*\n\n` +
        `⚠️ Unable to connect to backend server.\n\n` +
        `This might be because:\n` +
        `• Server is sleeping on Render (free tier)\n` +
        `• Network connectivity issue\n` +
        `• Server is starting up\n\n` +
        `💡 Try again in a few seconds or use the webapp to wake it up.`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  async notifyCreatorPayment(
    creatorId: string,
    amount: number,
    earnings: number,
    postId: string,
    buyerId: string,
    transactionHash: string
  ) {
    try {
      const post = await Post.findOne({ postId });
      const postTitle = post?.teaserText.substring(0, 50) || 'your post';
      const isLong = (post?.teaserText?.length || 0) > 50;

      const message =
        `💰 *Payment Received!*\n\n` +
        `You earned *${earnings.toFixed(2)} TON* (95% of ${amount.toFixed(2)} TON)\n\n` +
        `📝 Post: ${postTitle}${isLong ? '...' : ''}\n` +
        `👤 Buyer: User ${buyerId}\n\n` +
        `💳 Funds have been sent to your wallet!`;

      await this.bot.telegram.sendMessage(creatorId, message, {
        parse_mode: 'Markdown',
      });

      logger.info(`Payment notification sent to creator ${creatorId}`);
    } catch (error) {
      logger.error('Error notifying creator:', error);
    }
  }

  async deliverContent(userId: string, postId: string) {
    try {
      const post = await Post.findOne({ postId });
      if (!post) {
        logger.error(`Post not found: ${postId}`);
        return;
      }

      const message = `🎉 *Content Unlocked!*\n\n`;

      const maxRetries = 3;
      const retryDelay = 2000;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
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
          return;
        } catch (sendError: any) {
          if (attempt < maxRetries && sendError.code === 'ETIMEDOUT') {
            logger.warn(`Delivery attempt ${attempt} failed, retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else {
            throw sendError;
          }
        }
      }
    } catch (error) {
      logger.error('Error delivering content:', error instanceof Error ? error.message : String(error));

      logger.error(`Failed to deliver post ${postId} to user ${userId} - manual intervention may be required`);
    }
  }

  async launch() {
    try {
      await connectDatabase();

      logger.info('Starting Telegram bot...');

      const botInfo = await this.bot.telegram.getMe();
      logger.info(`Bot authenticated as: @${botInfo.username}`);

      this.bot.launch({
        dropPendingUpdates: true,
        allowedUpdates: ['message', 'callback_query', 'my_chat_member'],
      }).then(() => {
        logger.info('Tapp Bot started successfully');
      }).catch((error) => {
        logger.error('Bot polling error:', error);
      });

      logger.info('Bot launch initiated in background');

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
          if (retries === 0) {
            logger.error('Bot authentication failed after all retries. Bot will still handle webhooks.');
            logger.info('Server is still running, but bot authentication is unavailable');

            return;
          }
          logger.warn(`Bot authentication failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      logger.info(`Bot authenticated as: @${botInfo.username}`);

      const webhookDomain = process.env.WEBHOOK_DOMAIN || process.env.WEBAPP_URL?.replace('/webapp', '');
      if (!webhookDomain) {
        throw new Error('WEBHOOK_DOMAIN or WEBAPP_URL is required for webhook mode');
      }

      const webhookUrl = `${webhookDomain}/webhook/telegram`;

      try {
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
      } catch (error) {
        logger.warn('Failed to set webhook, but server will continue running');
        logger.warn('Webhook will still process incoming requests');
      }

      process.once('SIGINT', () => this.bot.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    } catch (error) {
      logger.error('Error in webhook launch:', error instanceof Error ? error.message : String(error));

    }
  }

  webhookCallback(path: string) {
    return this.bot.webhookCallback(path);
  }

  getBot() {
    return this.bot;
  }
}

const token = process.env.TELEGRAM_BOT_TOKEN || '';
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

export const tappBot = new TappBot(token);

if (require.main === module) {
  tappBot.launch();
}
