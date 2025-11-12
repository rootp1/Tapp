#!/bin/bash

# Test Sender Verification Security
# This script tests that the backend correctly verifies the sender of a transaction

echo "🧪 Testing Sender Verification Security"
echo "========================================"
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
ALICE_USER_ID="alice_test_$(date +%s)"
BOB_USER_ID="bob_test_$(date +%s)"
POST_ID="test_post_123"

# Alice's wallet (the one that will actually pay)
ALICE_WALLET="0QCqA6T6SEUKvvEKzoi3asP60Iga6g8GETHZLcI3oidVViDB"

# Bob's wallet (attacker trying to steal content)
BOB_WALLET="0QBOB1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567"

# Creator wallet
CREATOR_WALLET="0QDDJXsaY-yHNTtpCeXAdmx2of2rb3Jf70S-fvCMf9AYI5UZ"

echo "📋 Test Setup:"
echo "   API URL: $API_URL"
echo "   Alice (legitimate buyer): $ALICE_USER_ID"
echo "   Bob (attacker): $BOB_USER_ID"
echo "   Post ID: $POST_ID"
echo ""

# Step 1: Create transaction for Alice
echo "1️⃣  Creating transaction for ALICE..."
ALICE_TX=$(curl -s -X POST "$API_URL/api/payments/create" \
  -H "Content-Type: application/json" \
  -d "{
    \"postId\": \"$POST_ID\",
    \"userId\": \"$ALICE_USER_ID\",
    \"walletAddress\": \"$ALICE_WALLET\",
    \"creatorAddress\": \"$CREATOR_WALLET\"
  }")

ALICE_TX_ID=$(echo "$ALICE_TX" | jq -r '.transactionId')
echo "   ✅ Alice's transaction ID: $ALICE_TX_ID"
echo ""

# Step 2: Create transaction for Bob (attacker)
echo "2️⃣  Creating transaction for BOB (attacker)..."
BOB_TX=$(curl -s -X POST "$API_URL/api/payments/create" \
  -H "Content-Type: application/json" \
  -d "{
    \"postId\": \"$POST_ID\",
    \"userId\": \"$BOB_USER_ID\",
    \"walletAddress\": \"$BOB_WALLET\",
    \"creatorAddress\": \"$CREATOR_WALLET\"
  }")

BOB_TX_ID=$(echo "$BOB_TX" | jq -r '.transactionId')
echo "   ✅ Bob's transaction ID: $BOB_TX_ID"
echo ""

# Step 3: Simulate Alice's payment
echo "3️⃣  Simulating payment..."
echo "   💡 In real scenario, Alice would pay via TonConnect from wallet: $ALICE_WALLET"
echo "   💡 This would generate a transaction on the blockchain"
echo ""
echo "   🔧 For this test, you need to:"
echo "      1. Run: npx blueprint run testSenderVerification"
echo "      2. This will create a real payment from your wallet"
echo "      3. Copy the transaction hash/BOC from the output"
echo "      4. Use it in the next step"
echo ""

read -p "   📝 Paste the transaction hash/BOC from the payment: " PAYMENT_HASH
echo ""

# Step 4: Test 1 - Alice verifies with her own transaction (SHOULD WORK)
echo "4️⃣  TEST 1: Alice verifies with HER transaction ID"
echo "   Expected: ✅ SUCCESS (sender matches buyer)"
echo ""

ALICE_VERIFY=$(curl -s -X POST "$API_URL/api/payments/verify" \
  -H "Content-Type: application/json" \
  -d "{
    \"transactionId\": \"$ALICE_TX_ID\",
    \"tonTransactionHash\": \"$PAYMENT_HASH\"
  }")

echo "   Response:"
echo "$ALICE_VERIFY" | jq '.'

if echo "$ALICE_VERIFY" | grep -q '"success".*true\|"verified".*true'; then
  echo "   ✅ PASS: Alice successfully verified and received content!"
else
  echo "   ❌ FAIL: Alice's legitimate transaction was rejected"
  echo "   Check backend logs for errors"
fi
echo ""

# Step 5: Test 2 - Bob tries to use Alice's payment (SHOULD FAIL)
echo "5️⃣  TEST 2: Bob tries to verify with ALICE's payment"
echo "   Expected: ❌ FAIL (sender mismatch - Alice paid, not Bob)"
echo ""

BOB_VERIFY=$(curl -s -X POST "$API_URL/api/payments/verify" \
  -H "Content-Type: application/json" \
  -d "{
    \"transactionId\": \"$BOB_TX_ID\",
    \"tonTransactionHash\": \"$PAYMENT_HASH\"
  }")

echo "   Response:"
echo "$BOB_VERIFY" | jq '.'

if echo "$BOB_VERIFY" | grep -q '"error"\|"Invalid transaction"'; then
  echo "   ✅ PASS: Attack prevented! Bob was correctly rejected"
else
  echo "   ❌ FAIL: Security vulnerability! Bob was able to steal content"
  echo "   🚨 CRITICAL: Sender verification is not working!"
fi
echo ""

# Step 6: Test 3 - Try to reuse Alice's transaction (SHOULD FAIL)
echo "6️⃣  TEST 3: Trying to reuse Alice's transaction"
echo "   Expected: ❌ FAIL (duplicate transaction hash)"
echo ""

# Create new transaction
CHARLIE_TX=$(curl -s -X POST "$API_URL/api/payments/create" \
  -H "Content-Type: application/json" \
  -d "{
    \"postId\": \"$POST_ID\",
    \"userId\": \"charlie_test_$(date +%s)\",
    \"walletAddress\": \"$ALICE_WALLET\",
    \"creatorAddress\": \"$CREATOR_WALLET\"
  }")

CHARLIE_TX_ID=$(echo "$CHARLIE_TX" | jq -r '.transactionId')

CHARLIE_VERIFY=$(curl -s -X POST "$API_URL/api/payments/verify" \
  -H "Content-Type: application/json" \
  -d "{
    \"transactionId\": \"$CHARLIE_TX_ID\",
    \"tonTransactionHash\": \"$PAYMENT_HASH\"
  }")

echo "   Response:"
echo "$CHARLIE_VERIFY" | jq '.'

if echo "$CHARLIE_VERIFY" | grep -q '"Transaction already used"\|"already completed"'; then
  echo "   ✅ PASS: Duplicate transaction correctly rejected"
else
  echo "   ⚠️  WARNING: Duplicate prevention might not be working"
fi
echo ""

# Summary
echo "========================================"
echo "📊 TEST SUMMARY"
echo "========================================"
echo ""
echo "Security Tests:"
echo "  - Legitimate payment (Alice → Alice):    Check above"
echo "  - Attack attempt (Alice → Bob):          Check above"
echo "  - Duplicate transaction:                 Check above"
echo ""
echo "💡 To check backend logs:"
echo "   docker compose logs backend | tail -50"
echo ""
echo "   Look for:"
echo "   ✅ 'Sender verified: 0QCqA6...'"
echo "   ❌ 'Sender mismatch: expected 0QBOB..., got 0QCqA6...'"
echo ""
echo "========================================"
