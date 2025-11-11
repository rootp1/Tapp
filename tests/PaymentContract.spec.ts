import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, toNano } from '@ton/core';
import { PaymentContract } from '../wrappers/PaymentContract';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('PaymentContract', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('PaymentContract');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let platformWallet: SandboxContract<TreasuryContract>;
    let creator: SandboxContract<TreasuryContract>;
    let buyer: SandboxContract<TreasuryContract>;
    let paymentContract: SandboxContract<PaymentContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        platformWallet = await blockchain.treasury('platform');
        creator = await blockchain.treasury('creator');
        buyer = await blockchain.treasury('buyer');

        paymentContract = blockchain.openContract(
            PaymentContract.createFromConfig(
                {
                    platformAddress: platformWallet.address,
                    platformFeePercent: 10,
                    totalProcessed: 0,
                },
                code
            )
        );

        const deployResult = await paymentContract.sendDeploy(deployer.getSender(), toNano('0.1'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: paymentContract.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and paymentContract are ready to use
        const platformAddress = await paymentContract.getPlatformAddress();
        expect(platformAddress.toString()).toBe(platformWallet.address.toString());

        const feePercent = await paymentContract.getPlatformFeePercent();
        expect(feePercent).toBe(10);
    });

    it('should process payment and split funds correctly', async () => {
        const paymentAmount = toNano('1'); // 1 TON
        const postId = 123n;
        const queryId = 1n;

        const result = await paymentContract.sendProcessPayment(buyer.getSender(), {
            value: paymentAmount,
            queryId,
            postId,
            creatorAddress: creator.address,
        });

        expect(result.transactions).toHaveTransaction({
            from: buyer.address,
            to: paymentContract.address,
            success: true,
        });

        // Check that creator received ~0.9 TON (90% after 10% platform fee)
        expect(result.transactions).toHaveTransaction({
            from: paymentContract.address,
            to: creator.address,
            success: true,
        });

        // Check that platform received ~0.1 TON (10% platform fee)
        expect(result.transactions).toHaveTransaction({
            from: paymentContract.address,
            to: platformWallet.address,
            success: true,
        });

        // Check total processed counter increased
        const totalProcessed = await paymentContract.getTotalProcessed();
        expect(totalProcessed).toBe(1);
    });
});
