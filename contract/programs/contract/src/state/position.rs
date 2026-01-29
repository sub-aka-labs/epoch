use anchor_lang::prelude::*;
use crate::constants::ENCRYPTED_BET_SIZE;

#[account]
#[derive(InitSpace)]
pub struct UserPosition {
    pub market: Pubkey,
    pub owner: Pubkey,
    #[max_len(ENCRYPTED_BET_SIZE)]
    pub encrypted_bet: Vec<u8>,
    pub user_pubkey: [u8; 32],
    pub nonce: u128,
    pub deposit_amount: u64,
    pub payout_amount: u64,
    pub status: PositionStatus,
    pub computation_id: u64,
    pub bump: u8,
    pub created_at: i64,
    pub processed_at: Option<i64>,
    pub claimed_at: Option<i64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum PositionStatus {
    Pending,
    Processed,
    PayoutComputed,
    Claimed,
}

impl Default for PositionStatus {
    fn default() -> Self {
        PositionStatus::Pending
    }
}

impl UserPosition {
    pub fn can_claim_payout(&self) -> bool {
        self.status == PositionStatus::PayoutComputed && self.payout_amount > 0
    }
}
