import { Address, toNano, beginCell } from '@ton/core';
import { TonClient } from '@ton/ton';
import { postIdToUint64 } from '../src/utils/helpers';

/**
 * Interactive Test Payment
 * Sends a test transaction to the payment contract
 */

async function main() {
  // Addresses
  const CREATOR_ADDRESS = '0QDDJXsaY-yHNTtpCeXAdmx2of2rb3Jf70S-fvCMf9AYI5UZ';
  const CONTRACT_ADDRESS = 'EQDnwBScof_dTVYbAqtUaVbEjc2DUXgNJtWa-rmXz7yifkfp';
  
  // Payment details
  const PAYMENT_AMOUNT = '0.1';
  const POST_ID = 'test_post_12345';
  const QUERY_ID = BigInt(Date.now());
  
  console.log('\n🧪 SENDING TEST PAYMENT TRANSACTION\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📥 Creator Address:', CREATOR_ADDRESS);
  console.log('📋 Contract Address:', CONTRACT_ADDRESS);
  console.log('💵 Amount: 0.1 TON');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Convert addresses
  const creatorAddr = Address.parse(CREATOR_ADDRESS);
  const postIdHash = postIdToUint64(POST_ID);
  const amountInNano = toNano(PAYMENT_AMOUNT);
  
  // Build ProcessPayment message body
  const messageBody = beginCell()
    .storeUint(0x7e8764ef, 32)  // ProcessPayment opcode
    .storeUint(QUERY_ID, 64)
    .storeUint(postIdHash, 64)
    .storeAddress(creatorAddr)
    .storeCoins(amountInNano)
    .endCell();
  
  console.log('📝 Transaction Details:');
  console.log('  Contract:', CONTRACT_ADDRESS);
  console.log('  Amount:', PAYMENT_AMOUNT, 'TON');
  console.log('  Post ID:', POST_ID);
  console.log('  Query ID:', QUERY_ID.toString());
  console.log('\n📦 Message Body (base64):');
  console.log('  ', messageBody.toBoc().toString('base64'));
  console.log('\n═══════════════════════════════════════════════════════════════\n');
  
  console.log('📱 NEXT STEPS:\n');
  console.log('1. Run the deployment script with TON Connect:');
  console.log('   npm run contract:deploy\n');
  console.log('2. Choose "TON Connect compatible mobile wallet"\n');
  console.log('3. Or use Blueprint to send this transaction:\n');
  console.log('   npx blueprint run\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
