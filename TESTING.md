# Testing Guide

This guide covers testing the Tapp application.

## Prerequisites

- Telegram account
- TON testnet wallet (use Tonkeeper or Tonhub in testnet mode)
- Free testnet TON (get from https://t.me/testgiver_ton_bot)
- Running local development environment

## Setup Test Environment

### 1. Get Testnet TON

1. Open Tonkeeper wallet
2. Switch to testnet
3. Send `/start` to [@testgiver_ton_bot](https://t.me/testgiver_ton_bot)
4. Request free testnet TON

### 2. Configure for Testing

```bash
# Backend .env
TON_NETWORK=testnet
NODE_ENV=development
```

```bash
# Start services
npm run dev  # Terminal 1
cd webapp && npm run dev  # Terminal 2
```

## Manual Testing Checklist

### Bot Testing

#### 1. Basic Commands

- [ ] `/start` - Bot sends welcome message
- [ ] `/help` - Bot shows help text with all commands
- [ ] Bot responds to unknown commands

#### 2. Creator Onboarding

- [ ] Create a test Telegram channel
- [ ] Add bot as administrator to channel
- [ ] Grant "Post Messages" permission
- [ ] Bot acknowledges channel addition
- [ ] User is marked as creator in database

#### 3. Post Creation Flow

- [ ] Send `/createpost` command
- [ ] Bot shows list of channels
- [ ] Select a channel
- [ ] Enter valid price (e.g., 0.5)
  - [ ] Bot accepts valid price
  - [ ] Bot rejects invalid prices (< 0.1 or > 1000)
- [ ] Send teaser text (minimum 10 characters)
  - [ ] Bot accepts valid teaser
  - [ ] Bot rejects short teasers
- [ ] Send premium content:
  - [ ] Text message
  - [ ] Photo with caption
  - [ ] Video with caption
  - [ ] Document with caption
  - [ ] Audio file
- [ ] Bot shows preview
- [ ] Confirm post creation
- [ ] Teaser posted to channel with "Unlock" button

#### 4. Analytics Commands

- [ ] `/mychannels` - Shows list of channels with stats
- [ ] `/earnings` - Shows total earnings
- [ ] `/stats` - Shows post statistics

#### 5. Cancel Operation

- [ ] Start post creation
- [ ] Send `/cancel` mid-process
- [ ] Verify operation is cancelled

### Mini App Testing

#### 1. Access Mini App

- [ ] Click "Unlock" button on teaser post
- [ ] Mini App opens in Telegram
- [ ] Post details load correctly
- [ ] Price is displayed correctly
- [ ] Teaser text is shown

#### 2. Wallet Connection

- [ ] Click "Connect Wallet" button
- [ ] TON Connect modal opens
- [ ] Connect Tonkeeper wallet (testnet)
- [ ] Wallet address is displayed
- [ ] Disconnect and reconnect works

#### 3. Payment Flow

- [ ] Click "Unlock for X TON" button
- [ ] Tonkeeper opens with transaction details
- [ ] Verify amount is correct
- [ ] Verify recipient address is platform wallet
- [ ] Confirm transaction in Tonkeeper
- [ ] Wait for confirmation (3-5 seconds)
- [ ] Success message appears
- [ ] Mini App closes automatically

#### 4. Content Delivery

- [ ] Check Telegram DM from bot
- [ ] Verify content is delivered correctly:
  - [ ] Text content
  - [ ] Photo content
  - [ ] Video content
  - [ ] Document content
  - [ ] Audio content
- [ ] Verify content matches what creator uploaded

#### 5. Purchase History

- [ ] Try to unlock the same post again
- [ ] Verify "Already purchased" message
- [ ] Mini App closes without payment

#### 6. UI/UX

- [ ] Layout is responsive
- [ ] Colors match Telegram theme
- [ ] Buttons are clickable
- [ ] Loading states work
- [ ] Error messages are clear
- [ ] Animations are smooth

### API Testing

#### 1. Posts API

```bash
# Get post details
curl http://localhost:3000/api/posts/post_xxx?userId=123456789

# Expected response:
{
  "postId": "post_xxx",
  "price": 0.5,
  "currency": "TON",
  "teaserText": "Check out this premium content!",
  "contentType": "photo",
  "hasPurchased": false,
  "views": 5,
  "purchases": 2
}
```

```bash
# Get user purchases
curl http://localhost:3000/api/posts/user/123456789/purchases

# Expected response:
{
  "purchases": [
    {
      "postId": "post_xxx",
      "transactionId": "tx_yyy",
      "purchaseDate": "2025-01-08T12:00:00.000Z",
      "post": {
        "price": 0.5,
        "teaserText": "Premium content",
        "contentType": "photo"
      }
    }
  ]
}
```

#### 2. Payments API

```bash
# Create payment transaction
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "postId": "post_xxx",
    "userId": "123456789",
    "walletAddress": "EQABC..."
  }'

# Expected response:
{
  "transactionId": "tx_yyy",
  "amount": 0.5,
  "currency": "TON",
  "recipientAddress": "PLATFORM_WALLET_ADDRESS"
}
```

```bash
# Verify payment (requires real transaction)
curl -X POST http://localhost:3000/api/payments/verify \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "tx_yyy",
    "tonTransactionHash": "abc123..."
  }'

# Expected response:
{
  "success": true,
  "message": "Payment verified. Content delivered."
}
```

```bash
# Get transaction status
curl http://localhost:3000/api/payments/tx_yyy/status

# Expected response:
{
  "transactionId": "tx_yyy",
  "status": "completed",
  "amount": 0.5,
  "currency": "TON"
}
```

#### 3. Admin API

```bash
# Get platform statistics
curl http://localhost:3000/api/admin/stats?adminId=YOUR_TELEGRAM_ID

# Expected response:
{
  "users": {
    "total": 150,
    "creators": 25
  },
  "content": {
    "posts": 75,
    "channels": 30
  },
  "revenue": {
    "total": 125.50,
    "platform": 6.28,
    "creators": 119.22
  },
  "transactions": {
    "total": 200,
    "pending": 5,
    "completed": 190,
    "failed": 5
  }
}
```

### Database Testing

#### 1. Check Database State

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/tapp

# Check collections
show collections

# Check users
db.users.find().pretty()

# Check posts
db.posts.find().pretty()

# Check transactions
db.transactions.find().pretty()

# Check purchases
db.purchases.find().pretty()

# Check channels
db.channels.find().pretty()
```

#### 2. Verify Data Integrity

- [ ] User is created on first bot interaction
- [ ] Channel is linked to correct creator
- [ ] Post has correct price and content
- [ ] Transaction has correct amounts (platform fee = 5%)
- [ ] Purchase record links user and post
- [ ] User stats are updated after purchase
- [ ] Creator stats are updated after purchase

### TON Network Testing

#### 1. Transaction Verification

```bash
# Check transaction on TON explorer
https://testnet.tonscan.org/tx/<transaction_hash>
```

- [ ] Transaction appears on blockchain
- [ ] Amount is correct
- [ ] Recipient is platform wallet
- [ ] Transaction is confirmed

#### 2. Wallet Testing

- [ ] Connect wallet in testnet mode
- [ ] Send TON transaction
- [ ] Transaction is confirmed
- [ ] Balance is updated

## Edge Cases Testing

### 1. Network Issues

- [ ] Disconnect internet during payment
- [ ] Verify transaction status is pending
- [ ] Reconnect and verify again

### 2. Concurrent Operations

- [ ] Multiple users unlock same post simultaneously
- [ ] Verify all get content
- [ ] Verify stats are updated correctly

### 3. Invalid Data

- [ ] Try to unlock non-existent post
- [ ] Try to verify invalid transaction
- [ ] Try to access admin endpoints without permission

### 4. Payment Edge Cases

- [ ] Pay less than required amount
- [ ] Pay to wrong address
- [ ] Verify payment fails
- [ ] Try to unlock already purchased post

## Performance Testing

### Load Testing with Artillery

Install Artillery:
```bash
npm install -g artillery
```

Create test script `load-test.yml`:
```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - flow:
      - get:
          url: "/api/posts/post_xxx"
      - think: 1
      - post:
          url: "/api/payments/create"
          json:
            postId: "post_xxx"
            userId: "123456789"
            walletAddress: "EQABC..."
```

Run test:
```bash
artillery run load-test.yml
```

Expected results:
- [ ] 95% requests complete in < 200ms
- [ ] 0% error rate
- [ ] Server remains stable

## Security Testing

### 1. Authentication

- [ ] Try to access admin endpoints without adminId
- [ ] Verify 403 Forbidden response
- [ ] Try with invalid adminId
- [ ] Verify access denied

### 2. Input Validation

- [ ] Send malformed JSON to API
- [ ] Send SQL injection attempts
- [ ] Send XSS payloads
- [ ] Verify all are rejected

### 3. Payment Verification

- [ ] Try to verify fake transaction hash
- [ ] Verify payment fails
- [ ] Content is not delivered

## Monitoring & Logs

### Check Logs

```bash
# Backend logs
tail -f logs/combined.log

# Error logs
tail -f logs/error.log

# PM2 logs (if using PM2)
pm2 logs tapp-backend
```

### Monitor Database

```bash
# MongoDB stats
mongosh --eval "db.stats()"

# Connection count
mongosh --eval "db.serverStatus().connections"
```

## Automated Testing (Future)

### Unit Tests

Create test files:
- `src/models/__tests__/User.test.ts`
- `src/services/__tests__/tonService.test.ts`
- `src/utils/__tests__/helpers.test.ts`

### Integration Tests

Create test files:
- `src/routes/__tests__/posts.test.ts`
- `src/routes/__tests__/payments.test.ts`

### E2E Tests

Use tools:
- Playwright for WebApp testing
- Telegram Bot API for bot testing

## Test Completion Checklist

- [ ] All bot commands work
- [ ] Post creation flow is complete
- [ ] Payment flow works end-to-end
- [ ] Content delivery works
- [ ] All API endpoints respond correctly
- [ ] Database is populated correctly
- [ ] TON transactions are verified
- [ ] Edge cases are handled
- [ ] Performance is acceptable
- [ ] Security measures work

## Troubleshooting Tests

### Bot doesn't respond
- Check bot token
- Verify server is running
- Check MongoDB connection
- Review logs

### Payment fails
- Verify testnet TON in wallet
- Check TON_API_KEY
- Verify PLATFORM_WALLET_ADDRESS
- Check TON network status

### Content not delivered
- Verify bot can send DM
- User must have started bot
- Check transaction status
- Review delivery logs

---

After completing all tests, your Tapp application is ready for production deployment!
