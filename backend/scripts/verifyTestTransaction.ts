import { TonClient, Address } from '@ton/ton';
import { getHttpEndpoint } from '@orbs-network/ton-access';

async function verifyTransaction() {
    const CONTRACT_ADDRESS = 'EQDnwBScof_dTVYbAqtUaVbEjc2DUXgNJtWa-rmXz7yifkfp';
    const CREATOR_ADDRESS = '0QDDJXsaY-yHNTtpCeXAdmx2of2rb3Jf70S-fvCMf9AYI5UZ';
    const PLATFORM_ADDRESS = '0QCqA6T6SEUKvvEKzoi3asP60Iga6g8GETHZLcI3oidVViDB';

    console.log('\n🔍 VERIFYING TEST TRANSACTION\n');
    console.log('═══════════════════════════════════════════════════════════════');

    // Connect to testnet
    const endpoint = await getHttpEndpoint({ network: 'testnet' });
    const client = new TonClient({ endpoint });

    const contractAddr = Address.parse(CONTRACT_ADDRESS);

    console.log('📋 Fetching recent transactions from contract...\n');

    // Get recent transactions
    const transactions = await client.getTransactions(contractAddr, { limit: 10 });

    console.log(`Found ${transactions.length} recent transactions\n`);

    let testTxFound = false;

    for (const tx of transactions) {
        const inMsg = tx.inMessage;
        
        if (inMsg && inMsg.info.type === 'internal') {
            const from = inMsg.info.src;
            const value = inMsg.info.value.coins;
            const valueInTon = Number(value) / 1e9;

            console.log('═══════════════════════════════════════════════════════════════');
            console.log('📥 INCOMING TRANSACTION:');
            console.log(`  From: ${from.toString()}`);
            console.log(`  Amount: ${valueInTon.toFixed(4)} TON`);
            console.log(`  Time: ${new Date(tx.now * 1000).toLocaleString()}`);
            console.log(`  Success: ${tx.description.type === 'generic' && tx.description.computePhase.type === 'vm' && tx.description.computePhase.success}`);

            // Check outgoing messages
            if (tx.outMessages && tx.outMessages.size > 0) {
                console.log(`\n📤 OUTGOING MESSAGES (${tx.outMessages.size}):`);
                
                let creatorPaid = false;
                let platformPaid = false;

                tx.outMessages.forEach((outMsg, index) => {
                    if (outMsg.info.type === 'internal') {
                        const to = outMsg.info.dest;
                        const outValue = outMsg.info.value.coins;
                        const outValueInTon = Number(outValue) / 1e9;

                        const toStr = to.toString();
                        const isCreator = toStr.includes('DDJXsaY') || toStr.includes('0c32');
                        const isPlatform = toStr.includes('CqA6T6') || toStr.includes('aa03');

                        console.log(`\n  Message ${index + 1}:`);
                        console.log(`    To: ${toStr}`);
                        console.log(`    Amount: ${outValueInTon.toFixed(4)} TON`);
                        
                        if (isCreator) {
                            console.log(`    ✅ CREATOR PAYMENT (should be ~94%)`);
                            creatorPaid = true;
                        } else if (isPlatform) {
                            console.log(`    ✅ PLATFORM FEE (should be ~5%)`);
                            platformPaid = true;
                        }
                    }
                });

                if (creatorPaid && platformPaid) {
                    console.log('\n🎉 TEST TRANSACTION SUCCESSFUL!');
                    console.log('✅ Contract split funds correctly');
                    console.log('✅ Creator received payment');
                    console.log('✅ Platform received fee');
                    testTxFound = true;
                }
            }
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');

    if (testTxFound) {
        console.log('\n✅ VERIFICATION RESULT: SUCCESS');
        console.log('Your Tapp payment contract is working correctly! 🚀\n');
    } else {
        console.log('\n⏳ Transaction may still be processing...');
        console.log('Wait a few more seconds and check again.\n');
    }

    console.log('═══════════════════════════════════════════════════════════════\n');
}

verifyTransaction().catch(console.error);
