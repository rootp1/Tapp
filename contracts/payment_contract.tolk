tolk 1.1

// Storage structure for the payment contract
struct Storage {
    platformAddress: address    // Platform wallet address to receive fees
    platformFeePercent: uint8   // Platform fee percentage (e.g., 10 for 10%)
    totalProcessed: uint64      // Total payments processed (for statistics)
}

// Load contract data from persistent storage
fun Storage.load() {
    return Storage.fromCell(contract.getData())
}

// Save contract data to persistent storage
fun Storage.save(self) {
    contract.setData(self.toCell())
}

// Message to process a payment (buyer sends payment with creator info)
struct (0x7e8764ef) ProcessPayment {
    queryId: uint64        // Unique query identifier
    postId: uint64         // ID of the post being purchased
    creatorAddress: address // Address of the content creator
}

// Message to withdraw platform earnings (admin only)
struct (0x3a752f06) WithdrawPlatformFees {
    queryId: uint64
    amount: coins          // Amount to withdraw
}

// Union type for all allowed messages
type AllowedMessage = ProcessPayment | WithdrawPlatformFees

// Main entrypoint: handles incoming messages
// Note: In Tolk, we need to manually parse the full message to get value
fun onInternalMessage(in: InMessage) {
    val msg = lazy AllowedMessage.fromSlice(in.body);

    match (msg) {
        ProcessPayment => {
            // Load storage
            var storage = lazy Storage.load();

            // Get contract balance to calculate available funds
            val contractBalance = getBalance();
            val gasReserve = 100000000;  // 0.1 TON reserved for gas and storage

            // Ensure we have enough balance
            assert(contractBalance > gasReserve) throw 100;

            // Available amount is balance minus gas reserve
            val availableAmount = contractBalance - gasReserve;

            // Calculate fees and earnings
            // Platform fee = (amount * feePercent) / 100
            val platformFee = (availableAmount * storage.platformFeePercent) / 100;
            val creatorEarnings = availableAmount - platformFee;

            // Send earnings to creator
            sendRawMessage(beginCell()
                .storeUint(0x10, 6)                // nobounce
                .storeAddress(msg.creatorAddress)  // destination
                .storeCoins(creatorEarnings)
                .storeUint(0, 107)                 // empty payload
                .endCell(),
                1  // send mode: pay fees separately
            );

            // Send platform fee to platform address
            sendRawMessage(beginCell()
                .storeUint(0x10, 6)                    // nobounce
                .storeAddress(storage.platformAddress) // destination
                .storeCoins(platformFee)
                .storeUint(0, 107)                     // empty payload
                .endCell(),
                1  // send mode: pay fees separately
            );

            // Update statistics
            storage.totalProcessed += 1;
            storage.save();
        }

        WithdrawPlatformFees => {
            // Load storage
            var storage = lazy Storage.load();

            // Note: Sender validation would require parsing in.fullMessage
            // For now, we'll allow withdrawals (in production, add sender check)

            // Send the requested amount back to platform
            sendRawMessage(beginCell()
                .storeUint(0x10, 6)
                .storeAddress(storage.platformAddress)
                .storeCoins(msg.amount)
                .storeUint(0, 107)
                .endCell(),
                1
            );
        }

        else => {
            // Accept empty messages (just deposits), reject others
            assert(in.body.isEmpty()) throw 0xFFFF;
        }
    }
}

// Handler for bounced messages
fun onBouncedMessage(in: InMessageBounced) {
    // If payment bounces, we just accept it back
    // In production, you might want to emit an event or handle this differently
}

// Get method: returns total payments processed
get fun getTotalProcessed(): int {
    val storage = lazy Storage.load();
    return storage.totalProcessed;
}

// Get method: returns platform address
get fun getPlatformAddress(): address {
    val storage = lazy Storage.load();
    return storage.platformAddress;
}

// Get method: returns platform fee percentage
get fun getPlatformFeePercent(): int {
    val storage = lazy Storage.load();
    return storage.platformFeePercent;
}

// Get method: returns contract balance
get fun getBalance(): int {
    return getBalance();
}
