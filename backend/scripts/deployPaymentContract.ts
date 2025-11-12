import { Address, toNano } from '@ton/core';
import { PaymentContract } from '../wrappers/PaymentContract';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    // Get sender address
    const senderAddress = provider.sender().address;
    if (!senderAddress) {
        throw new Error('Sender address is not available');
    }

    // Get platform address from environment or use sender address
    const platformAddress = process.env.PLATFORM_WALLET_ADDRESS
        ? Address.parse(process.env.PLATFORM_WALLET_ADDRESS)
        : senderAddress;

    // Platform fee percentage (default 5%)
    const platformFeePercent = parseInt(process.env.PLATFORM_FEE_PERCENT || '5');

    console.log('Deploying PaymentContract with:');
    console.log('  Platform Address:', platformAddress.toString());
    console.log('  Platform Fee:', platformFeePercent + '%');

    // Compile the contract first
    const compiledContract = await compile('PaymentContract');
    console.log('Contract compiled successfully');

    // Create the contract instance
    const contractInstance = PaymentContract.createFromConfig(
        {
            platformAddress,
            platformFeePercent,
            totalProcessed: 0,
        },
        compiledContract
    );

    console.log('Contract instance created at address:', contractInstance.address.toString());

    // Open the contract with the provider
    const contract = provider.open(contractInstance);

    // Deploy the contract
    console.log('Sending deploy transaction...');
    await contract.sendDeploy(provider.sender(), toNano('0.1'));

    console.log('Waiting for deployment...');
    await provider.waitForDeploy(contractInstance.address);

    console.log('\n✅ Contract deployed at:', contractInstance.address.toString());

    // Verify deployment by calling get methods (with a small delay and error handling)
    try {
        // Wait a bit for contract to be fully initialized
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\nVerifying contract state...');
        const feePercent = await contract.getPlatformFeePercent();
        console.log('Platform Fee Percent:', feePercent + '%');
    } catch (error) {
        console.log('\nNote: Contract deployed successfully but get methods are not yet available.');
        console.log('The contract may need a few more seconds to initialize on the blockchain.');
        console.log('You can verify the deployment at: https://testnet.tonscan.org/address/' + contractInstance.address.toString());
    }
}
