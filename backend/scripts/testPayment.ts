import { Address, toNano, beginCell } from '@ton/core';
import { postIdToUint64 } from '../src/utils/helpers';

/**
 * Test Payment Transaction Generator
 * This script generates the transaction details for testing the payment contract
 */

// Addresses
const SENDER_ADDRESS = '0QCqA6T6SEUKvvEKzoi3asP60Iga6g8GETHZLcI3oidVViDB'; // Your wallet (also platform)
const CREATOR_ADDRESS = '0QDDJXsaY-yHNTtpCeXAdmx2of2rb3Jf70S-fvCMf9AYI5UZ'; // Creator wallet
const CONTRACT_ADDRESS = 'EQDnwBScof_dTVYbAqtUaVbEjc2DUXgNJtWa-rmXz7yifkfp'; // Payment contract

// Payment details
const PAYMENT_AMOUNT = '0.1'; // 0.1 TON
const POST_ID = 'test_post_12345'; // Dummy post ID
const QUERY_ID = BigInt(Date.now());

// Convert addresses
const creatorAddr = Address.parse(CREATOR_ADDRESS);
const contractAddr = Address.parse(CONTRACT_ADDRESS);

// Convert post ID to uint64
const postIdHash = postIdToUint64(POST_ID);

// Convert amount to nanoTON
const amountInNano = toNano(PAYMENT_AMOUNT);

// Build ProcessPayment message body
const messageBody = beginCell()
  .storeUint(0x7e8764ef, 32)  // ProcessPayment opcode
  .storeUint(QUERY_ID, 64)     // Query ID
  .storeUint(postIdHash, 64)   // Post ID hash
  .storeAddress(creatorAddr)   // Creator address
  .storeCoins(amountInNano)    // Amount (0.1 TON in nanoTON)
  .endCell();

// Generate transaction for TonKeeper
const transaction = {
  validUntil: Math.floor(Date.now() / 1000) + 300, // Valid for 5 minutes
  messages: [
    {
      address: CONTRACT_ADDRESS,
      amount: amountInNano.toString(), // 100000000 nanoTON = 0.1 TON
      payload: messageBody.toBoc().toString('base64'),
    }
  ]
};

console.log('\n🧪 TEST PAYMENT TRANSACTION\n');
console.log('═══════════════════════════════════════════════════════════════');
console.log('📤 From (Your Wallet):', SENDER_ADDRESS);
console.log('📥 Creator (95% goes here):', CREATOR_ADDRESS);
console.log('💰 Platform Fee (5% back to you):', SENDER_ADDRESS);
console.log('📋 Contract Address:', CONTRACT_ADDRESS);
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('💵 Payment Amount: 0.1 TON');
console.log('📊 Fee Split:');
console.log('  • Creator receives: ~0.0941 TON (94.1% after 0.01 TON gas)');
console.log('  • Platform receives: ~0.0049 TON (4.9%)');
console.log('  • Gas reserve: ~0.01 TON\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('📝 TRANSACTION DETAILS FOR TONKEEPER:\n');
console.log(JSON.stringify(transaction, null, 2));
console.log('\n═══════════════════════════════════════════════════════════════\n');

console.log('🔗 TONKEEPER DEEP LINK:\n');

// Create TonKeeper deep link
const tonkeeperLink = `https://app.tonkeeper.com/transfer/${CONTRACT_ADDRESS}?amount=${amountInNano.toString()}&text=Test%20Payment&bin=${encodeURIComponent(messageBody.toBoc().toString('base64'))}`;

console.log(tonkeeperLink);
console.log('\n═══════════════════════════════════════════════════════════════\n');

console.log('📱 INSTRUCTIONS:\n');
console.log('1. Copy the link above');
console.log('2. Open it in your browser (mobile or desktop)');
console.log('3. TonKeeper will open automatically');
console.log('4. Review and confirm the transaction');
console.log('5. Wait ~30 seconds for blockchain confirmation\n');

console.log('🔍 VERIFY TRANSACTION:\n');
console.log('Contract: https://testnet.tonscan.org/address/' + CONTRACT_ADDRESS);
console.log('Your Wallet: https://testnet.tonscan.org/address/' + SENDER_ADDRESS);
console.log('Creator Wallet: https://testnet.tonscan.org/address/' + CREATOR_ADDRESS);
console.log('\n═══════════════════════════════════════════════════════════════\n');

// Also generate QR code data
console.log('📋 FOR QR CODE GENERATION:\n');
console.log('Use this URL in a QR code generator:');
console.log(tonkeeperLink);
console.log('\nOr use: https://www.qr-code-generator.com/\n');

export { transaction, tonkeeperLink };
