#!/bin/bash

# Development script to run both backend and webapp

set -e

echo "🚀 Starting Tapp in development mode..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run setup.sh first."
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start backend
echo "📦 Starting backend on port 3000..."
npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start webapp
echo "📦 Starting webapp on port 5173..."
cd webapp
npm run dev &
WEBAPP_PID=$!
cd ..

echo ""
echo "✅ Services started!"
echo ""
echo "📍 Backend: http://localhost:3000"
echo "📍 WebApp: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for processes
wait $BACKEND_PID $WEBAPP_PID
