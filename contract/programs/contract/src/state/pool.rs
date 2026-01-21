use anchor_lang::prelude::*;
use crate::constants::ENCRYPTED_STATE_SIZE;

#[account]
#[derive(InitSpace)]
pub struct EncryptedPoolState {
    /// Market this pool belongs to
    pub market: Pubkey,

    /// Encrypted state blob (MXE-encrypted)
    /// Contains: total_yes, total_no, total_deposits, bet_count, salt
    /// Only MXE can decrypt and update
    #[max_len(ENCRYPTED_STATE_SIZE)]
    pub encrypted_state: Vec<u8>,

    /// State version - increments on each update
    pub state_version: u64,

    /// Last computation ID processed
    pub last_computation_id: u64,

    /// Number of pending computations
    pub pending_computations: u32,

    /// Last update timestamp
    pub last_updated: i64,

    /// PDA bump
    pub bump: u8,

    /// Whether pool is initialized
    pub is_initialized: bool,
}

impl EncryptedPoolState {
    pub fn is_ready(&self) -> bool {
        self.is_initialized && self.state_version > 0
    }
}
