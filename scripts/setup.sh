#!/bin/bash

# Tapp Setup Script
# This script helps you set up the Tapp project quickly

set -e

echo "🚀 Tapp Setup Script"
echo "===================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version) found"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm $(npm --version) found"

# Check if MongoDB is running
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.version()" &> /dev/null; then
        echo "✅ MongoDB is running"
    else
        echo "⚠️  MongoDB is not running. Please start MongoDB."
        echo "   Run: mongod"
    fi
else
    echo "⚠️  MongoDB CLI not found. Make sure MongoDB is installed and running."
fi

echo ""
echo "📦 Installing backend dependencies..."
npm install

echo ""
echo "📦 Installing webapp dependencies..."
cd webapp
npm install
cd ..

echo ""
echo "📄 Setting up environment files..."

# Create backend .env if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file (please edit with your values)"
else
    echo "⚠️  .env file already exists"
fi

# Create webapp .env if it doesn't exist
if [ ! -f webapp/.env ]; then
    cp webapp/.env.example webapp/.env
    echo "✅ Created webapp/.env file"
else
    echo "⚠️  webapp/.env file already exists"
fi

# Create logs directory
mkdir -p logs
echo "✅ Created logs directory"

# Create uploads directory
mkdir -p uploads
echo "✅ Created uploads directory"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env file with your configuration:"
echo "   - TELEGRAM_BOT_TOKEN (get from @BotFather)"
echo "   - TON_API_KEY (get from toncenter.com)"
echo "   - PLATFORM_WALLET_ADDRESS (your TON wallet)"
echo "   - Other required values"
echo ""
echo "2. Edit webapp/.env with your API URL"
echo ""
echo "3. Start MongoDB if not running:"
echo "   mongod"
echo ""
echo "4. Start the backend:"
echo "   npm run dev"
echo ""
echo "5. In another terminal, start the webapp:"
echo "   cd webapp && npm run dev"
echo ""
echo "6. Configure your bot in @BotFather with the webapp URL"
echo ""
echo "📚 For detailed instructions, see README.md"
echo ""
