use anchor_lang::prelude::*;
use crate::constants::ENCRYPTED_BET_SIZE;

#[account]
#[derive(InitSpace)]
pub struct UserPosition {
    /// Market this position belongs to
    pub market: Pubkey,

    /// Position owner
    pub owner: Pubkey,

    /// Encrypted bet data: [outcome_cipher, amount_cipher, salt_cipher]
    /// Encrypted with shared secret between user and MXE
    #[max_len(ENCRYPTED_BET_SIZE)]
    pub encrypted_bet: Vec<u8>,

    /// User's x25519 public key for shared secret derivation
    pub user_pubkey: [u8; 32],

    /// Encryption nonce
    pub nonce: u128,

    /// Deposit amount (visible on-chain, but NOT which side)
    pub deposit_amount: u64,

    /// Computed payout amount (set after settlement)
    pub payout_amount: u64,

    /// Position status
    pub status: PositionStatus,

    /// Computation ID for tracking
    pub computation_id: u64,

    /// PDA bump
    pub bump: u8,

    /// Timestamps
    pub created_at: i64,
    pub processed_at: Option<i64>,
    pub claimed_at: Option<i64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum PositionStatus {
    /// Bet submitted, awaiting MPC processing
    Pending,
    /// Bet processed and added to pool
    Processed,
    /// Payout computed after resolution
    PayoutComputed,
    /// Payout claimed
    Claimed,
    /// Refund claimed (market cancelled)
    Refunded,
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

    pub fn can_claim_refund(&self) -> bool {
        self.status == PositionStatus::Processed || self.status == PositionStatus::Pending
    }
}
