import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";
import { createVrfPermit, loadAccount, toAccountString } from "../utils";

export const VRF_PRODUCER_PERMIT_ACCOUNT_FILE = "producerPermitAccount.json";

export async function createVrfProducerPermitAction(argv: any): Promise<void> {
  const producerPermitFile = path.join(
    process.cwd(),
    VRF_PRODUCER_PERMIT_ACCOUNT_FILE
  );
  if (fs.existsSync(producerPermitFile)) {
    throw new Error(
      `producerPermitFile already exists at ${producerPermitFile}`
    );
  }

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const payerAccount = loadAccount(argv.payerFile);
  const vrfAccount = loadAccount(argv.vrfFile);

  const producerPermitAccount = await createVrfPermit(
    connection,
    payerAccount,
    vrfAccount,
    payerAccount
  );
  console.log(
    toAccountString("producerPermit", producerPermitAccount.publicKey)
  );

  fs.writeFileSync(
    producerPermitFile,
    `[${Keypair.fromSecretKey(producerPermitAccount.secretKey).secretKey}]`
  );
  console.log(toAccountString("producerPermitFile", producerPermitFile));

  // console.log(
  //   "\n",
  //   toExportString("producerPermit", producerPermitAccount.publicKey)
  // );
  // console.log(toExportString("producerPermitFile", producerPermitFile));
}
