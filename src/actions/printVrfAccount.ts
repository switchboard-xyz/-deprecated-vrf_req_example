import { clusterApiUrl, Connection } from "@solana/web3.js";
import { loadAccount, printVrfAccount, toAccountString } from "../utils";

export async function printRandomnessAction(argv: any): Promise<void> {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const vrfAccount = loadAccount(argv.vrfFile);

  console.log(toAccountString("VrfAccount", vrfAccount.publicKey));

  await printVrfAccount(connection, vrfAccount);
}
