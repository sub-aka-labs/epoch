use anchor_lang::prelude::*;
use crate::constants::MAX_QUESTION_LEN;

#[account]
#[derive(InitSpace)]
pub struct DarkMarket {
    pub authority: Pubkey,
    pub market_id: u64,
    #[max_len(MAX_QUESTION_LEN)]
    pub question: String,
    pub token_mint: Pubkey,
    pub vault: Pubkey,
    pub pool_state: Pubkey,
    pub betting_start_ts: i64,
    pub betting_end_ts: i64,
    pub resolution_end_ts: i64,
    pub status: MarketStatus,
    pub winning_outcome: Option<u8>,
    pub total_positions: u32,
    pub state_commitment: [u8; 32],
    pub bump: u8,
    pub vault_bump: u8,
    pub pool_state_bump: u8,
    pub created_at: i64,
    pub resolved_at: Option<i64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum MarketStatus {
    Created,
    Open,
    BettingClosed,
    Resolved,
    Settled,
    Cancelled,
}

impl Default for MarketStatus {
    fn default() -> Self {
        MarketStatus::Created
    }
}
