// PDA Seeds
pub const MARKET_SEED: &[u8] = b"dark_market";
pub const POOL_STATE_SEED: &[u8] = b"pool_state";
pub const USER_POSITION_SEED: &[u8] = b"position";
pub const VAULT_SEED: &[u8] = b"vault";

// Size limits
pub const MAX_QUESTION_LEN: usize = 200;
// Encrypted bet: 32 bytes for outcome + 32 bytes for amount = 64 bytes
pub const ENCRYPTED_BET_SIZE: usize = 64;
pub const ENCRYPTED_STATE_SIZE: usize = 256;

