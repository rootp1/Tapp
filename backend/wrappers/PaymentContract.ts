import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, toNano } from '@ton/core';

export type PaymentContractConfig = {
    platformAddress: Address;
    platformFeePercent: number;
    totalProcessed: number;
};

export function paymentContractConfigToCell(config: PaymentContractConfig): Cell {
    return beginCell()
        .storeAddress(config.platformAddress)
        .storeUint(config.platformFeePercent, 8)
        .storeUint(config.totalProcessed, 64)
        .endCell();
}

export const Opcodes = {
    processPayment: 0x7e8764ef,
    withdrawPlatformFees: 0x3a752f06,
};

export class PaymentContract implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell }
    ) {}

    static createFromAddress(address: Address) {
        return new PaymentContract(address);
    }

    static createFromConfig(config: PaymentContractConfig, code: Cell, workchain = 0) {
        const data = paymentContractConfigToCell(config);
        const init = { code, data };
        return new PaymentContract(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendProcessPayment(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            queryId: bigint;
            postId: bigint;
            creatorAddress: Address;
            amount: bigint;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.processPayment, 32)
                .storeUint(opts.queryId, 64)
                .storeUint(opts.postId, 64)
                .storeAddress(opts.creatorAddress)
                .storeCoins(opts.amount)
                .endCell(),
        });
    }

    async sendWithdrawPlatformFees(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            queryId: bigint;
            amount: bigint;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.withdrawPlatformFees, 32)
                .storeUint(opts.queryId, 64)
                .storeCoins(opts.amount)
                .endCell(),
        });
    }

    async getTotalProcessed(provider: ContractProvider): Promise<number> {
        const result = await provider.get('getTotalProcessed', []);
        return result.stack.readNumber();
    }

    async getPlatformAddress(provider: ContractProvider): Promise<Address> {
        const result = await provider.get('getPlatformAddress', []);
        return result.stack.readAddress();
    }

    async getPlatformFeePercent(provider: ContractProvider): Promise<number> {
        const result = await provider.get('getPlatformFeePercent', []);
        return result.stack.readNumber();
    }
}
