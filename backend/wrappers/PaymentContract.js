"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentContract = exports.Opcodes = void 0;
exports.paymentContractConfigToCell = paymentContractConfigToCell;
const core_1 = require("@ton/core");
function paymentContractConfigToCell(config) {
    return (0, core_1.beginCell)()
        .storeAddress(config.platformAddress)
        .storeUint(config.platformFeePercent, 8)
        .storeUint(config.totalProcessed, 64)
        .endCell();
}
exports.Opcodes = {
    processPayment: 0x7e8764ef,
    withdrawPlatformFees: 0x3a752f06,
};
class PaymentContract {
    constructor(address, init) {
        this.address = address;
        this.init = init;
    }
    static createFromAddress(address) {
        return new PaymentContract(address);
    }
    static createFromConfig(config, code, workchain = 0) {
        const data = paymentContractConfigToCell(config);
        const init = { code, data };
        return new PaymentContract((0, core_1.contractAddress)(workchain, init), init);
    }
    async sendDeploy(provider, via, value) {
        await provider.internal(via, {
            value,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: (0, core_1.beginCell)().endCell(),
        });
    }
    async sendProcessPayment(provider, via, opts) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: (0, core_1.beginCell)()
                .storeUint(exports.Opcodes.processPayment, 32)
                .storeUint(opts.queryId, 64)
                .storeUint(opts.postId, 64)
                .storeAddress(opts.creatorAddress)
                .storeCoins(opts.amount)
                .endCell(),
        });
    }
    async sendWithdrawPlatformFees(provider, via, opts) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: (0, core_1.beginCell)()
                .storeUint(exports.Opcodes.withdrawPlatformFees, 32)
                .storeUint(opts.queryId, 64)
                .storeCoins(opts.amount)
                .endCell(),
        });
    }
    async getTotalProcessed(provider) {
        const result = await provider.get('getTotalProcessed', []);
        return result.stack.readNumber();
    }
    async getPlatformAddress(provider) {
        const result = await provider.get('getPlatformAddress', []);
        return result.stack.readAddress();
    }
    async getPlatformFeePercent(provider) {
        const result = await provider.get('getPlatformFeePercent', []);
        return result.stack.readNumber();
    }
}
exports.PaymentContract = PaymentContract;
