use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    pub struct ProcessBetInput {
        pub outcome: u8,
        pub amount: u64,
    }

    pub struct ProcessBetResult {
        pub validated_outcome: u8,
        pub validated_amount: u64,
        pub success: u8,
    }

    pub struct ComputePayoutInput {
        pub user_outcome: u8,
        pub user_amount: u64,
        pub winning_outcome: u8,
        pub winning_pool: u64,
        pub losing_pool: u64,
    }

    pub struct PayoutResult {
        pub payout: u64,
    }

    #[instruction]
    pub fn process_bet(input: Enc<Shared, ProcessBetInput>) -> Enc<Shared, ProcessBetResult> {
        let bet = input.to_arcis();

        let valid_outcome = if bet.outcome > 1 { 0u8 } else { 1u8 };
        let valid_amount = if bet.amount == 0 { 0u8 } else { 1u8 };
        let success = if valid_outcome == 1 && valid_amount == 1 { 1u8 } else { 0u8 };

        let result = ProcessBetResult {
            validated_outcome: if success == 1 { bet.outcome } else { 0 },
            validated_amount: if success == 1 { bet.amount } else { 0 },
            success,
        };

        input.owner.from_arcis(result)
    }

    #[instruction]
    pub fn compute_payout(input: Enc<Shared, ComputePayoutInput>) -> Enc<Shared, PayoutResult> {
        let data = input.to_arcis();

        let user_won = if data.user_outcome == data.winning_outcome { 1u8 } else { 0u8 };

        let payout = if user_won == 1 && data.winning_pool > 0 {
            let share = (data.user_amount * data.losing_pool) / data.winning_pool;
            data.user_amount + share
        } else if user_won == 1 {
            data.user_amount
        } else {
            0u64
        };

        let result = PayoutResult { payout };

        input.owner.from_arcis(result)
    }
}
