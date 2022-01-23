import {
  clusterApiUrl,
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import path from "node:path";
import {
  loadAccount,
  loadKeypair,
  printVrfAccount,
  watchTransaction,
} from "../utils";

export const loadOnchainPid = (): PublicKey => {
  const programKeypairFile = path.join(
    // eslint-disable-next-line unicorn/prefer-module
    __dirname,
    "../../vrf-example-program/target/deploy/switchboard_v1_vrf_example-keypair.json"
  );
  const programKeypair = loadKeypair(programKeypairFile);
  return programKeypair.publicKey;
};

export async function readOnchainResult(argv: any): Promise<void> {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const payerKeypair = loadKeypair(argv.payerFile);
  const vrfAccount = loadAccount(argv.vrfFile);

  const pid = loadOnchainPid();
  console.log(`PID: ${pid}`);
  console.log(`VRF: ${vrfAccount.publicKey}`);
  await printVrfAccount(connection, vrfAccount);

  const transactionInstruction = new TransactionInstruction({
    keys: [
      { pubkey: vrfAccount.publicKey, isSigner: false, isWritable: false },
    ],
    programId: pid,
  });
  const tx = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(transactionInstruction),
    [payerKeypair]
  );

  watchTransaction(tx, connection);
}
