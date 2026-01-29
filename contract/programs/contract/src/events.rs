use anchor_lang::prelude::*;

#[event]
pub struct MarketCreated {
    pub market: Pubkey,
    pub market_id: u64,
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub betting_end_ts: i64,
    pub resolution_end_ts: i64,
}

#[event]
pub struct MarketOpened {
    pub market: Pubkey,
    pub opened_at: i64,
}

#[event]
pub struct BetPlaced {
    pub market: Pubkey,
    pub position: Pubkey,
    pub bettor: Pubkey,
    pub deposit_amount: u64,
    pub computation_id: u64,
}

#[event]
pub struct BetProcessed {
    pub market: Pubkey,
    pub position: Pubkey,
    pub state_version: u64,
    pub new_commitment: [u8; 32],
}

#[event]
pub struct BettingClosed {
    pub market: Pubkey,
    pub total_positions: u32,
    pub closed_at: i64,
}

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub winning_outcome: u8,
    pub resolved_at: i64,
}

#[event]
pub struct PayoutComputed {
    pub market: Pubkey,
    pub position: Pubkey,
    pub user: Pubkey,
    pub payout_amount: u64,
}

#[event]
pub struct PayoutClaimed {
    pub market: Pubkey,
    pub position: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct PoolStateUpdated {
    pub market: Pubkey,
    pub state_version: u64,
    pub commitment: [u8; 32],
    pub updated_at: i64,
}
