pub use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg, program_error,
    program_error::ProgramError,
    pubkey::Pubkey,
};
pub use switchboard_program::VrfAccount;

entrypoint!(process_instruction);

const MAX_VALUE: u64 = 25000;

fn process_instruction<'a>(
    _program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    _instruction_data: &'a [u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let vrf_account = next_account_info(accounts_iter)?;

    let vrf = VrfAccount::new(vrf_account)?.get_verified_randomness()?;
    let value: &[u64] = bytemuck::cast_slice(&vrf[..]);
    let result = value[0] % MAX_VALUE;

    msg!("Current VRF Value [0 - {}) = {}!", MAX_VALUE, result);
    Ok(())
}
