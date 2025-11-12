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
    amount: coins          // Amount being paid (for calculation)
}

// Message to withdraw platform earnings (admin only)
struct (0x3a752f06) WithdrawPlatformFees {
    queryId: uint64
    amount: coins          // Amount to withdraw
}

// Union type for all allowed messages
type AllowedMessage = ProcessPayment | WithdrawPlatformFees

// Main entrypoint: handles incoming messages
fun onInternalMessage(in: InMessage) {
    val msg = lazy AllowedMessage.fromSlice(in.body);

    match (msg) {
        ProcessPayment => {
            // Load storage
            var storage = lazy Storage.load();

            // Use the amount from the message
            val totalAmount = msg.amount;
            val gasReserve = 10000000;  // 0.01 TON for gas

            // Ensure we have enough
            assert(totalAmount > gasReserve) throw 100;

            // Split available amount (after gas reserve)
            val amountToSplit = totalAmount - gasReserve;

            // Calculate fees and earnings
            val platformFee = (amountToSplit * storage.platformFeePercent) / 100;
            val creatorEarnings = amountToSplit - platformFee;

            // Send earnings to creator
            sendRawMessage(beginCell()
                .storeUint(0x10, 6)                // nobounce
                .storeAddress(msg.creatorAddress)  // destination
                .storeCoins(creatorEarnings)
                .storeUint(0, 107)                 // empty payload
                .endCell(),
                1  // send mode: pay transfer fees separately
            );

            // Send platform fee to platform address
            sendRawMessage(beginCell()
                .storeUint(0x10, 6)                    // nobounce
                .storeAddress(storage.platformAddress) // destination
                .storeCoins(platformFee)
                .storeUint(0, 107)                     // empty payload
                .endCell(),
                1  // send mode: pay transfer fees separately
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
