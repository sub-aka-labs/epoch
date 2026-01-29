use anchor_lang::prelude::*;
use crate::constants::ENCRYPTED_STATE_SIZE;

#[account]
#[derive(InitSpace)]
pub struct EncryptedPoolState {
    pub market: Pubkey,
    #[max_len(ENCRYPTED_STATE_SIZE)]
    pub encrypted_state: Vec<u8>,
    pub state_version: u64,
    pub last_computation_id: u64,
    pub pending_computations: u32,
    pub last_updated: i64,
    pub bump: u8,
    pub is_initialized: bool,
}

impl EncryptedPoolState {
    pub fn is_ready(&self) -> bool {
        self.is_initialized && self.state_version > 0
    }
}
