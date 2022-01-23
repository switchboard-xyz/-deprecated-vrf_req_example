import {
  Account,
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  parseVrfAccountData,
  publishSwitchboardAccount,
  SwitchboardAccountType,
  SwitchboardInstruction,
  SWITCHBOARD_DEVNET_PID,
} from "@switchboard-xyz/switchboard-api";
import Big from "big.js";
import { sleep } from "./sleep";

export const getArrayOfSizeN = (number_: number): number[] => {
  return Array.from({ length: number_ }, (_, index) => index + 1);
};

export const printVrfAccount = async (
  connection: Connection,
  vrfAccount: Account
): Promise<void> => {
  const SPACING = 24;
  const state = await parseVrfAccountData(connection, vrfAccount.publicKey);
  console.log(
    JSON.stringify(
      state,
      (key, value) => {
        if (key.toLowerCase().endsWith("pubkey") && value instanceof Uint8Array)
          return new PublicKey(value);
        return value;
      },
      2
    )
  );
};

export const readRandomness = async (
  connection: Connection,
  vrfAccount: Account
): Promise<Big> => {
  const state = await parseVrfAccountData(connection, vrfAccount.publicKey);
  if (state.numProofConfirmations >= state.minProofConfirmations) {
    const buffer = Buffer.from(state.value);
    const bigint = buffer.readBigUInt64BE();
    return new Big(bigint.toString());
  }

  throw new Error(`insufficient proof confirmations`);
};

export const awaitRandomness = async (
  connection: Connection,
  vrfAccount: Account
): Promise<Big> => {
  const RETRY_COUNT = 30;
  for await (const attempt of getArrayOfSizeN(RETRY_COUNT)) {
    try {
      const value = await readRandomness(connection, vrfAccount);
      return value;
    } catch {}
    await sleep(1000);
  }
  throw new Error(`failed to read vrf randomness value`);
};

export async function createVrfPermit(
  connection: Connection,
  payerAccount: Account,
  vrfAccount: Account,
  granterAccount: Account
): Promise<Account> {
  const permitAccount = new Account();
  await publishSwitchboardAccount(
    connection,
    permitAccount,
    payerAccount,
    SWITCHBOARD_DEVNET_PID,
    SwitchboardAccountType.TYPE_VRF_PERMIT,
    250
  );

  const transactionInstruction = new TransactionInstruction({
    keys: [
      { pubkey: permitAccount.publicKey, isSigner: true, isWritable: true },
      { pubkey: granterAccount.publicKey, isSigner: true, isWritable: false },
      { pubkey: vrfAccount.publicKey, isSigner: false, isWritable: false },
    ],
    programId: SWITCHBOARD_DEVNET_PID,
    data: Buffer.from(
      SwitchboardInstruction.encodeDelimited(
        SwitchboardInstruction.create({
          setVrfPermitInstruction:
            SwitchboardInstruction.SetVrfPermitInstruction.create({
              enabled: true,
            }),
        })
      ).finish()
    ),
  });

  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(transactionInstruction),
    [payerAccount, permitAccount, granterAccount]
  );

  return permitAccount;
}
