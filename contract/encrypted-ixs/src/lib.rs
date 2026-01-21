use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    // =========================================================================
    // Data Structures
    // =========================================================================

    /// Input structure for processing a bet
    /// Only contains user-provided encrypted data
    pub struct ProcessBetInput {
        /// Outcome: 0 = NO, 1 = YES
        pub outcome: u8,
        /// Bet amount in tokens
        pub amount: u64,
    }

    /// Result of processing a bet - validated bet info
    pub struct ProcessBetResult {
        /// The validated outcome (0 or 1)
        pub validated_outcome: u8,
        /// The validated amount
        pub validated_amount: u64,
        /// Whether bet was valid (1 = valid, 0 = invalid)
        pub success: u8,
    }

    /// Input structure for computing payout
    pub struct ComputePayoutInput {
        /// User's bet outcome (0 or 1)
        pub user_outcome: u8,
        /// User's bet amount
        pub user_amount: u64,
        /// Winning outcome (0 or 1)
        pub winning_outcome: u8,
        /// Total winning pool
        pub winning_pool: u64,
        /// Total losing pool
        pub losing_pool: u64,
    }

    /// Payout result
    pub struct PayoutResult {
        /// Calculated payout amount
        pub payout: u64,
    }

    // =========================================================================
    // MPC Instructions
    // =========================================================================

    /// Process an encrypted bet and validate it
    ///
    /// Privacy guarantees:
    /// - Nobody sees which side the user bet on during processing
    /// - The validated result is returned encrypted
    #[instruction]
    pub fn process_bet(input: Enc<Shared, ProcessBetInput>) -> Enc<Shared, ProcessBetResult> {
        let bet = input.to_arcis();

        // Validate outcome (must be 0 or 1)
        let valid_outcome = if bet.outcome > 1 { 0u8 } else { 1u8 };
        // Validate amount (must be non-zero)
        let valid_amount = if bet.amount == 0 { 0u8 } else { 1u8 };
        // Overall success
        let success = if valid_outcome == 1 && valid_amount == 1 { 1u8 } else { 0u8 };

        // Return validated bet info
        let result = ProcessBetResult {
            validated_outcome: if success == 1 { bet.outcome } else { 0 },
            validated_amount: if success == 1 { bet.amount } else { 0 },
            success,
        };

        input.owner.from_arcis(result)
    }

    /// Compute payout for a user after market resolution
    ///
    /// The payout formula for winners:
    /// payout = user_bet + (user_bet * losing_pool) / winning_pool
    #[instruction]
    pub fn compute_payout(input: Enc<Shared, ComputePayoutInput>) -> Enc<Shared, PayoutResult> {
        let data = input.to_arcis();

        // Check if user won
        let user_won = if data.user_outcome == data.winning_outcome { 1u8 } else { 0u8 };

        // Calculate payout if user won
        let payout = if user_won == 1 && data.winning_pool > 0 {
            // payout = user_amount + (user_amount * losing_pool) / winning_pool
            let share = (data.user_amount * data.losing_pool) / data.winning_pool;
            data.user_amount + share
        } else if user_won == 1 {
            // Edge case: no winning pool, return deposit
            data.user_amount
        } else {
            // User lost - no payout
            0u64
        };

        let result = PayoutResult { payout };

        input.owner.from_arcis(result)
    }

    /// Get implied odds for a potential bet
    ///
    /// Returns odds scaled by 1e9 without revealing pool state.
    pub struct OddsInput {
        pub outcome: u8,
        pub amount: u64,
        pub pool_yes: u64,
        pub pool_no: u64,
    }

    pub struct OddsResult {
        pub odds: u64,
    }

    #[instruction]
    pub fn get_odds(input: Enc<Shared, OddsInput>) -> Enc<Shared, OddsResult> {
        let data = input.to_arcis();

        // Scale factor for precision
        let scale: u64 = 1_000_000_000;

        // Calculate implied odds
        // odds = (opposite_pool + amount) * scale / (my_pool + amount)
        let odds = if data.outcome == 1 {
            // YES bet - odds based on NO pool
            let my_pool = data.pool_yes + data.amount;
            let opposite = data.pool_no + data.amount;
            if my_pool > 0 {
                (opposite * scale) / my_pool
            } else {
                scale // 1:1 if empty
            }
        } else {
            // NO bet - odds based on YES pool
            let my_pool = data.pool_no + data.amount;
            let opposite = data.pool_yes + data.amount;
            if my_pool > 0 {
                (opposite * scale) / my_pool
            } else {
                scale
            }
        };

        let result = OddsResult { odds };
        input.owner.from_arcis(result)
    }
}
