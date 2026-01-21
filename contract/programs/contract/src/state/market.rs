use anchor_lang::prelude::*;
use crate::constants::MAX_QUESTION_LEN;

#[account]
#[derive(InitSpace)]
pub struct DarkMarket {
    /// Market authority - can resolve and manage market
    pub authority: Pubkey,

    /// Unique market identifier
    pub market_id: u64,

    /// The prediction question (publicly visible)
    #[max_len(MAX_QUESTION_LEN)]
    pub question: String,

    /// Token mint for betting
    pub token_mint: Pubkey,

    /// Vault PDA holding all deposits
    pub vault: Pubkey,

    /// Pool state account reference
    pub pool_state: Pubkey,

    /// Betting start timestamp
    pub betting_start_ts: i64,

    /// Betting end timestamp
    pub betting_end_ts: i64,

    /// Resolution deadline timestamp
    pub resolution_end_ts: i64,

    /// Current market status
    pub status: MarketStatus,

    /// Winning outcome after resolution (0=NO, 1=YES)
    pub winning_outcome: Option<u8>,

    /// Total number of positions (bet count visible, not per-side)
    pub total_positions: u32,

    /// Commitment hash of current encrypted state
    pub state_commitment: [u8; 32],

    /// PDA bumps
    pub bump: u8,
    pub vault_bump: u8,
    pub pool_state_bump: u8,

    /// Timestamps
    pub created_at: i64,
    pub resolved_at: Option<i64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum MarketStatus {
    /// Market created, awaiting pool initialization
    Created,
    /// Pool initialized, open for betting
    Open,
    /// Betting period ended, awaiting resolution
    BettingClosed,
    /// Market resolved with outcome
    Resolved,
    /// Payouts computed, ready for claims
    Settled,
    /// Market cancelled, refunds available
    Cancelled,
}

impl Default for MarketStatus {
    fn default() -> Self {
        MarketStatus::Created
    }
}
