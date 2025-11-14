# Tapp Creator Mini App

A Telegram Mini App for content creators to manage premium posts and earn from their content.

## Features

- 📊 Dashboard with earnings and stats
- ✨ Create premium posts with teasers
- 📝 Manage your posts
- 💼 Wallet integration with TON Connect
- 📱 Native Telegram Mini App experience

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
VITE_API_URL=https://your-backend-api.com/api
VITE_MANIFEST_URL=https://your-creator-app.vercel.app/tonconnect-manifest.json
```

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables:
   - `VITE_API_URL`
   - `VITE_MANIFEST_URL`
4. Deploy!

## Configure Telegram Bot

After deploying, set up your bot menu button:

1. Send `/setmenubutton` to @BotFather
2. Select your bot
3. Choose "Edit menu button URL"
4. Enter: `https://your-creator-app.vercel.app`
5. Set button text: "Creator Studio"

## Tech Stack

- React + TypeScript
- Vite
- TON Connect
- Telegram Mini Apps SDK
- Axios
