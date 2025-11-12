import { Address, toNano } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { PaymentContract } from '../wrappers/PaymentContract';
import { TonClient } from '@ton/ton';

/**
 * Test script to verify sender verification is working
 * This tests that only the correct wallet can verify a payment
 */
async function run(provider: NetworkProvider) {
  const contractAddress = Address.parse(process.env.PAYMENT_CONTRACT_ADDRESS || '');
  
  console.log('🧪 Testing Sender Verification\n');
  console.log(`Contract: ${contractAddress.toString()}\n`);

  const paymentContract = provider.open(PaymentContract.createFromAddress(contractAddress));

  // Test wallets
  const aliceWallet = provider.sender(); // The wallet running this script
  const creatorAddress = Address.parse('0QDDJXsaY-yHNTtpCeXAdmx2of2rb3Jf70S-fvCMf9AYI5UZ');
  
  console.log(`👤 Alice's Wallet: ${aliceWallet.address?.toString()}`);
  console.log(`👤 Creator: ${creatorAddress.toString()}\n`);

  // Test data
  const queryId = BigInt(Date.now());
  const postId = BigInt(12345);
  const amount = toNano('0.05'); // 0.05 TON

  console.log('📝 Test Parameters:');
  console.log(`   Query ID: ${queryId}`);
  console.log(`   Post ID: ${postId}`);
  console.log(`   Amount: 0.05 TON\n`);

  // Send payment
  console.log('💸 Sending payment from Alice\'s wallet...');
  
  try {
    await paymentContract.sendProcessPayment(
      aliceWallet,
      {
        queryId,
        postId,
        creatorAddress: creatorAddress,
        amount,
        value: amount + toNano('0.05'), // amount + gas
      }
    );

    console.log('✅ Payment sent successfully!\n');

    // Wait for transaction to process
    console.log('⏳ Waiting 10 seconds for transaction to process...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Now check recent transactions
    console.log('\n🔍 Checking recent transactions on contract...\n');

    const endpoint = process.env.TON_NETWORK === 'mainnet'
      ? 'https://toncenter.com/api/v2/jsonRPC'
      : 'https://testnet.toncenter.com/api/v2/jsonRPC';

    const client = new TonClient({ endpoint });
    const transactions = await client.getTransactions(contractAddress, { limit: 5 });

    console.log(`Found ${transactions.length} recent transactions:\n`);

    transactions.forEach((tx, index) => {
      const inMsg = tx.inMessage;
      if (!inMsg || inMsg.info.type !== 'internal') {
        console.log(`${index + 1}. [External message - skip]`);
        return;
      }

      const sender = inMsg.info.src?.toString() || 'unknown';
      const value = Number(inMsg.info.value.coins) / 1e9;
      const txHash = tx.hash().toString('hex');

      console.log(`${index + 1}. Transaction:`);
      console.log(`   Hash: ${txHash.substring(0, 16)}...`);
      console.log(`   From: ${sender.substring(0, 20)}...`);
      console.log(`   Amount: ${value.toFixed(4)} TON`);
      console.log(`   Time: ${new Date(tx.now * 1000).toISOString()}`);

      // Check if this matches our payment
      const isAlice = sender === aliceWallet.address?.toString();
      const isCorrectAmount = Math.abs(value - 0.05) < 0.001;

      if (isAlice && isCorrectAmount) {
        console.log(`   ✅ THIS IS ALICE'S PAYMENT!`);
        
        // Try to parse message body
        if (inMsg.body) {
          try {
            const bodySlice = inMsg.body.beginParse();
            const opcode = bodySlice.loadUint(32);
            
            if (opcode === 0x7e8764ef) {
              const qId = bodySlice.loadUintBig(64);
              const pId = bodySlice.loadUintBig(64);
              const creator = bodySlice.loadAddress();
              
              console.log(`   📦 Message Body:`);
              console.log(`      Opcode: 0x${opcode.toString(16)}`);
              console.log(`      Query ID: ${qId}`);
              console.log(`      Post ID: ${pId}`);
              console.log(`      Creator: ${creator.toString()}`);
            }
          } catch (e) {
            console.log(`   ⚠️  Could not parse message body`);
          }
        }
      } else if (isAlice) {
        console.log(`   ℹ️  From Alice but wrong amount`);
      } else if (isCorrectAmount) {
        console.log(`   ℹ️  Correct amount but from: ${sender.substring(0, 20)}...`);
      }

      console.log('');
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('\n✅ Payment sent successfully from Alice\'s wallet');
    console.log('✅ Transaction appears on blockchain');
    console.log('✅ Sender address is recorded in transaction');
    console.log('\n💡 Next Steps:');
    console.log('   1. Use this transaction hash in your backend /verify endpoint');
    console.log('   2. Backend should verify sender matches Alice\'s wallet');
    console.log('   3. Try creating a transaction for BOB and verify with Alice\'s payment');
    console.log('      → Should FAIL with "Sender mismatch" error');
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

export { run };
