import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";
import { createVrfPermit, loadAccount, toAccountString } from "../utils";

export const VRF_PERMIT_ACCOUNT_FILE = "vrfPermitAccount.json";

export async function createVrfPermitAction(argv: any): Promise<void> {
  const vrfPermitFile = path.join(process.cwd(), VRF_PERMIT_ACCOUNT_FILE);
  if (fs.existsSync(vrfPermitFile)) {
    throw new Error(`vrfPermitFile already exists at ${vrfPermitFile}`);
  }

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const payerAccount = loadAccount(argv.payerFile);
  const ffmAccount = loadAccount(argv.ffmFile);
  const vrfAccount = loadAccount(argv.vrfFile);

  const vrfPermitAccount = await createVrfPermit(
    connection,
    payerAccount,
    vrfAccount,
    ffmAccount
  );
  console.log(toAccountString("vrfPermit", vrfPermitAccount.publicKey));

  fs.writeFileSync(
    vrfPermitFile,
    `[${Keypair.fromSecretKey(vrfPermitAccount.secretKey).secretKey}]`
  );
  console.log(toAccountString("vrfPermitFile", vrfPermitFile));

  // console.log("\n", toExportString("vrfPermit", vrfPermitAccount.publicKey));
  // console.log(toExportString("vrfPermitFile", vrfPermitFile));
}
