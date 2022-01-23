import { clusterApiUrl, Connection } from "@solana/web3.js";
import { requestRandomness } from "@switchboard-xyz/switchboard-api";
import { loadAccount } from "../utils";

export async function requestRandomnessAction(argv: any): Promise<void> {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const payerAccount = loadAccount(argv.payerFile);
  const vrfAccount = loadAccount(argv.vrfFile);
  const vrfPermitAccount = loadAccount(argv.vrfPermitFile);
  const producerPermitAccount = loadAccount(argv.producerPermitFile);

  await requestRandomness(
    connection,
    payerAccount,
    vrfAccount,
    vrfPermitAccount.publicKey,
    producerPermitAccount.publicKey
  );

  // add logic to wait for value to change and print to console
}
