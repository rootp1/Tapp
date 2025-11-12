import { Address, toNano, beginCell } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { postIdToUint64 } from '../src/utils/helpers';

export async function run(provider: NetworkProvider) {
    // Get sender (this will trigger TonConnect to your mobile)
    const sender = provider.sender();
    
    // Addresses
    const CREATOR_ADDRESS = '0QDDJXsaY-yHNTtpCeXAdmx2of2rb3Jf70S-fvCMf9AYI5UZ';
    const CONTRACT_ADDRESS = 'EQDnwBScof_dTVYbAqtUaVbEjc2DUXgNJtWa-rmXz7yifkfp';
    
    // Payment details
    const PAYMENT_AMOUNT = toNano('0.1'); // 0.1 TON
    const POST_ID = 'test_post_12345';
    const QUERY_ID = BigInt(Date.now());
    
    console.log('\n🧪 TEST PAYMENT TRANSACTION\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📤 From:', sender.address?.toString());
    console.log('📥 Creator (95%):', CREATOR_ADDRESS);
    console.log('💰 Platform (5%):', sender.address?.toString());
    console.log('📋 Contract:', CONTRACT_ADDRESS);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('💵 Sending: 0.1 TON');
    console.log('📊 Expected Split:');
    console.log('  • Creator: ~0.0941 TON (94.1%)');
    console.log('  • Platform: ~0.0049 TON (4.9%)');
    console.log('  • Gas: ~0.01 TON\n');
    
    // Convert addresses
    const creatorAddr = Address.parse(CREATOR_ADDRESS);
    const contractAddr = Address.parse(CONTRACT_ADDRESS);
    const postIdHash = postIdToUint64(POST_ID);
    
    // Build ProcessPayment message body
    const messageBody = beginCell()
        .storeUint(0x7e8764ef, 32)  // ProcessPayment opcode
        .storeUint(QUERY_ID, 64)
        .storeUint(postIdHash, 64)
        .storeAddress(creatorAddr)
        .storeCoins(PAYMENT_AMOUNT)
        .endCell();
    
    console.log('📝 Message Details:');
    console.log('  OpCode: 0x7e8764ef (ProcessPayment)');
    console.log('  Query ID:', QUERY_ID.toString());
    console.log('  Post ID Hash:', postIdHash.toString());
    console.log('  Creator:', CREATOR_ADDRESS);
    console.log('  Amount:', '0.1 TON');
    console.log('\n═══════════════════════════════════════════════════════════════\n');
    
    console.log('📱 Please approve the transaction on your mobile TonKeeper...\n');
    
    // Send the transaction
    await sender.send({
        to: contractAddr,
        value: PAYMENT_AMOUNT,
        body: messageBody,
        bounce: true,
    });
    
    console.log('✅ Transaction sent successfully!\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 VERIFY ON BLOCKCHAIN:\n');
    console.log('Contract:', `https://testnet.tonscan.org/address/${CONTRACT_ADDRESS}`);
    console.log('Your Wallet:', `https://testnet.tonscan.org/address/${sender.address?.toString()}`);
    console.log('Creator Wallet:', `https://testnet.tonscan.org/address/${CREATOR_ADDRESS}`);
    console.log('\n⏳ Wait ~30 seconds for confirmation, then check the links above');
    console.log('═══════════════════════════════════════════════════════════════\n');
}
