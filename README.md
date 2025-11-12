# Tapp - Telegram + TON Micropayment Platform

[![Telegram Bot](https://img.shields.io/badge/Telegram-Bot-blue?logo=telegram)](https://t.me/YOUR_BOT_USERNAME)
[![TON](https://img.shields.io/badge/TON-Blockchain-0098EA?logo=ton)](https://ton.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Tapp is a Telegram + TON blockchain-based micropayment platform that lets creators monetize individual Telegram posts. Users can unlock premium content with one-tap TON payments through a Telegram Mini App.

## 🚀 Quick Start

**Try it now:** [@YOUR_BOT_USERNAME](https://t.me/YOUR_BOT_USERNAME)

## ✨ Features

### For Creators
- 🤖 Onboard via Telegram bot with simple commands
- 📢 Add the bot as admin to your channel
- 📝 Create premium posts directly through chat (upload file, set price, add teaser)
- 🎯 Automatically publish teaser message with "Unlock" button
- 📊 View earnings and analytics (views, purchases, total TON earned)
- 💰 Earn 95% of payment (platform keeps 5% fee)
- 💼 Set your TON wallet address to receive payments

### For Users
- 👆 Tap "Unlock" on premium post teaser inside Telegram
- 📱 Mini App opens showing post preview and price
- 🔗 Connect TON wallet via TON Connect and make payment
- 📬 Receive premium content directly in Telegram DM after verification
- 🧾 Transaction receipt and content stored in purchase history

### For Admins
- 📈 Dashboard to monitor transactions, users, and posts
- ✅ Verify creators and flag spam/abuse
- 🔍 Real-time platform statistics

### 🆕 Backend Status Monitoring
- ⚡ **Real-time status indicator** in webapp showing backend health
- 🟢 **Visual health monitoring** with response time tracking
- 🚀 **One-click wake-up button** for Render free tier sleep mode
- 📱 **/status command** in Telegram bot to check backend availability
- 🔄 **Auto-refresh** every 30 seconds to monitor backend health
- ⏳ **Clear feedback** during server wake-up process (30-60 seconds)

## Tech Stack

### Backend
- Node.js + TypeScript
- Express.js (REST API)
- MongoDB + Mongoose (Database)
- Telegraf (Telegram Bot Framework)
- TON SDK (@ton/ton, @ton/core)

### Frontend (Mini App)
- React + TypeScript
- Vite (Build tool)
- TON Connect UI React (Wallet integration)
- Telegram WebApp SDK

## Project Structure

```
Tapp/
├── src/
│   ├── bot/
│   │   └── index.ts              # Telegram bot implementation
│   ├── config/
│   │   ├── constants.ts          # App constants
│   │   └── database.ts           # Database connection
│   ├── models/
│   │   ├── User.ts               # User model
│   │   ├── Channel.ts            # Channel model
│   │   ├── Post.ts               # Post model
│   │   ├── Transaction.ts        # Transaction model
│   │   └── Purchase.ts           # Purchase model
│   ├── routes/
│   │   ├── posts.ts              # Post endpoints
│   │   ├── payments.ts           # Payment endpoints
│   │   └── admin.ts              # Admin endpoints
│   ├── services/
│   │   └── tonService.ts         # TON blockchain integration
│   ├── utils/
│   │   ├── helpers.ts            # Helper functions
│   │   └── logger.ts             # Winston logger
│   └── index.ts                  # Main server entry
├── webapp/
│   ├── src/
│   │   ├── App.tsx               # Main app component
│   │   ├── index.css             # Global styles
│   │   └── main.tsx              # Entry point
│   ├── public/
│   │   └── tonconnect-manifest.json
│   └── package.json
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or cloud instance)
- Telegram account
- TON wallet (for testing)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Tapp
```

### 2. Create Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow the prompts to create your bot
4. Copy the bot token (you'll need it for `.env`)
5. Set bot commands with `/setcommands`:
   ```
   start - Start the bot
   help - Show help message
   createpost - Create a new premium post
   mychannels - View your channels
   earnings - Check your earnings
   stats - View post statistics
   status - Check backend server status
   cancel - Cancel current operation
   ```

### 3. Create Telegram Mini App

1. Send `/newapp` to BotFather
2. Select your bot
3. Provide app name, description, and icon
4. Set the Web App URL (your deployed webapp URL)

### 4. Backend Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**.env Configuration:**

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_BOT_USERNAME=YourBotUsername
WEBAPP_URL=https://your-domain.com/webapp

# Database
MONGODB_URI=mongodb://localhost:27017/tapp

# Server
PORT=3000
NODE_ENV=development

# TON Network
TON_NETWORK=testnet  # or mainnet for production
TON_API_KEY=your_ton_api_key
PLATFORM_WALLET_ADDRESS=your_platform_ton_wallet_address

# Platform Settings
PLATFORM_FEE_PERCENT=5

# JWT Secret
JWT_SECRET=your_random_secret_key_here

# Admin (comma-separated Telegram user IDs)
ADMIN_TELEGRAM_IDS=123456789,987654321
```

**Get TON API Key:**
- Visit https://toncenter.com/
- Register and get an API key for testnet or mainnet

**Create TON Wallet:**
- Use Tonkeeper or Tonhub app
- Copy your wallet address for `PLATFORM_WALLET_ADDRESS`

### 5. WebApp Setup

```bash
cd webapp

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env
nano .env
```

**webapp/.env:**

```env
VITE_API_URL=http://localhost:3000/api
```

**Update TON Connect Manifest:**

Edit `webapp/public/tonconnect-manifest.json`:

```json
{
  "url": "https://your-domain.com",
  "name": "Tapp",
  "iconUrl": "https://your-domain.com/icon.png",
  "termsOfUseUrl": "https://your-domain.com/terms",
  "privacyPolicyUrl": "https://your-domain.com/privacy"
}
```

### 6. Start MongoDB

```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env with your Atlas connection string
```

### 7. Run the Application

**Development Mode:**

Terminal 1 (Backend):
```bash
npm run dev
```

Terminal 2 (WebApp):
```bash
cd webapp
npm run dev
```

**Production Mode:**

```bash
# Build backend
npm run build

# Build webapp
cd webapp
npm run build
cd ..

# Start server
npm start
```

## Usage Guide

### For Creators

1. **Start the bot**: Search for your bot in Telegram and send `/start`

2. **Add bot to channel**:
   - Go to your Telegram channel
   - Add the bot as an administrator
   - Grant "Post Messages" permission

3. **Create a premium post**:
   - Send `/createpost` to the bot
   - Select your channel
   - Set the price (in TON)
   - Send teaser text (what users see before unlocking)
   - Send premium content (text, photo, video, or document)
   - Confirm to publish

4. **View earnings**: Send `/earnings` to see your total earnings

5. **View statistics**: Send `/stats` to see post performance

6. **Check backend status**: Send `/status` to check if the server is online

### For Users

1. **See premium post**: Browse channels with Tapp-enabled premium content

2. **Click "Unlock" button**: Opens the Mini App

3. **Check backend status**: Look at the status indicator (🟢/🟡/🟠/🔴) in top-right corner
   - If offline (🔴), click to open panel and use "Wake Up Server" button

4. **Connect wallet**: Click "Connect Wallet" and select your TON wallet

5. **Pay to unlock**: Click "Unlock for X TON" to make payment

6. **Receive content**: Content will be sent to your Telegram DM

7. **View history**: All your purchases are tracked

### For Admins

Access admin endpoints via API:

```bash
# Get platform statistics
GET /api/admin/stats?adminId=YOUR_TELEGRAM_ID

# Verify a creator
POST /api/admin/verify-creator/:userId?adminId=YOUR_TELEGRAM_ID

# Deactivate a post
POST /api/admin/posts/:postId/deactivate?adminId=YOUR_TELEGRAM_ID
```

## API Documentation

### Posts API

**Get Post Details**
```
GET /api/posts/:postId?userId=TELEGRAM_USER_ID
```

**Get User Purchases**
```
GET /api/posts/user/:userId/purchases
```

### Payments API

**Create Payment Transaction**
```
POST /api/payments/create
Body: {
  "postId": "post_xxx",
  "userId": "123456789",
  "walletAddress": "EQABC..."
}
```

**Verify Payment**
```
POST /api/payments/verify
Body: {
  "transactionId": "tx_xxx",
  "tonTransactionHash": "abc123..."
}
```

**Get Transaction Status**
```
GET /api/payments/:transactionId/status
```

### Admin API

**Get Platform Statistics**
```
GET /api/admin/stats?adminId=YOUR_ID
```

**Get Recent Transactions**
```
GET /api/admin/transactions?adminId=YOUR_ID&limit=50
```

**Verify Creator**
```
POST /api/admin/verify-creator/:userId?adminId=YOUR_ID
```

**Deactivate Post**
```
POST /api/admin/posts/:postId/deactivate?adminId=YOUR_ID
```

## Deployment

### Deploy Backend (Example: Railway/Heroku)

1. **Prepare for deployment**:
   ```bash
   # Ensure all dependencies are in package.json
   # Set NODE_ENV=production
   ```

2. **Set environment variables** in your hosting platform

3. **Deploy**:
   ```bash
   git push railway main
   # or
   git push heroku main
   ```

### Deploy WebApp (Example: Vercel/Netlify)

1. **Build the app**:
   ```bash
   cd webapp
   npm run build
   ```

2. **Deploy to Vercel**:
   ```bash
   npm i -g vercel
   vercel --prod
   ```

3. **Update environment variables** in Vercel dashboard

4. **Update BotFather** with your WebApp URL

### Database (MongoDB Atlas)

1. Create account at https://cloud.mongodb.com
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in your environment

## Security Best Practices

1. **Never commit `.env` files** - Keep them in `.gitignore`
2. **Use strong JWT secrets** - Generate with `openssl rand -hex 32`
3. **Validate all user input** - Express-validator is included
4. **Rate limiting** - Add rate limiting middleware in production
5. **HTTPS only** - Always use HTTPS in production
6. **Verify TON transactions** - Always verify on-chain before delivering content
7. **Admin access control** - Strictly control admin Telegram IDs

## Troubleshooting

### Backend Status Issues (Render Free Tier)

**Server shows offline or slow:**
- The free tier sleeps after 15 minutes of inactivity
- Click the status indicator (top-right of webapp)
- Use "🚀 Wake Up Server" button
- Wait 30-60 seconds for server to wake up
- Or send `/status` command in Telegram bot

**Wake-up taking too long:**
- First wake-up can take up to 60 seconds
- Subsequent requests will be faster
- Check `/status` in bot to verify server is responding

### Bot not responding
- Check if bot token is correct
- Verify MongoDB connection
- Check logs: `tail -f logs/combined.log`

### Payment not working
- Verify TON_API_KEY is valid
- Check PLATFORM_WALLET_ADDRESS is correct
- Ensure wallet has testnet TON (for testing)
- Check TON network status

### WebApp not loading
- Verify WEBAPP_URL is correct in bot settings
- Check CORS settings in backend
- Ensure VITE_API_URL points to correct API

### Content not delivered
- Check bot has permission to send DM to user
- User must have started the bot first
- Check transaction verification logs

## TON Network

### Testnet (Development)
- Use testnet for development
- Get free testnet TON from https://t.me/testgiver_ton_bot
- Set `TON_NETWORK=testnet` in .env

### Mainnet (Production)
- Use mainnet for production
- Real TON payments
- Set `TON_NETWORK=mainnet` in .env
- Ensure PLATFORM_WALLET_ADDRESS is a mainnet address

## License

MIT License - feel free to use for your own projects

## Support

For issues and questions:
- Open an issue on GitHub
- Contact: your-email@example.com

## Roadmap

### Completed Features ✅
- [x] TON blockchain payment integration
- [x] Telegram Mini App for payments
- [x] Smart contract for payment verification
- [x] Backend status monitoring system
- [x] One-click server wake-up for free tier hosting
- [x] Real-time health checks

### Stretch Features (Future Development)
- [ ] Web dashboard for creators
- [ ] Referral system for users
- [ ] NFT-based proof of purchase
- [ ] AI-powered content suggestions
- [ ] Multi-language support
- [ ] Analytics dashboard
- [ ] Subscription model for channels
- [ ] Bulk post creation
- [ ] Content scheduling

## Credits

Built with:
- [Telegraf](https://github.com/telegraf/telegraf) - Telegram Bot Framework
- [TON](https://ton.org/) - The Open Network
- [TON Connect](https://github.com/ton-connect) - TON Wallet Integration
- [Express](https://expressjs.com/) - Web Framework
- [React](https://react.dev/) - UI Library
- [MongoDB](https://www.mongodb.com/) - Database

---

Made with ❤️ for the Telegram and TON community
