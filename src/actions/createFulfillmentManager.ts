import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import {
  createFulfillmentManager,
  setFulfillmentManagerConfigs,
  SWITCHBOARD_DEVNET_PID,
} from "@switchboard-xyz/switchboard-api";
import fs from "node:fs";
import path from "node:path";
import { loadAccount, loadKeypair, toAccountString } from "../utils";

export const FULFILLMENT_MANAGER_FILE = "ffmAccount.json";

export async function createFulfillmentManagerAction(argv: any): Promise<void> {
  const ffmFile = path.join(process.cwd(), FULFILLMENT_MANAGER_FILE);
  if (fs.existsSync(ffmFile)) {
    const fulfillmentManagerAccount = loadKeypair(ffmFile);
    console.log(
      toAccountString("FulfillmentManager", fulfillmentManagerAccount.publicKey)
    );
    throw new Error(`ffmAccountFile already exists at ${ffmFile}`);
  }
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const payerAccount = loadAccount(argv.payerFile);

  const fulfillmentManagerAccount = await createFulfillmentManager(
    connection,
    payerAccount,
    SWITCHBOARD_DEVNET_PID
  );
  console.log(
    toAccountString("FulfillmentManager", fulfillmentManagerAccount.publicKey)
  );

  const fulfillmentManagerConfig = {
    heartbeatAuthRequired: true,
    usageAuthRequired: true,
    lock: false,
  };

  await setFulfillmentManagerConfigs(
    connection,
    payerAccount,
    fulfillmentManagerAccount,
    fulfillmentManagerConfig
  );
  console.log(
    toAccountString(
      "FulfillmentManagerConfig",
      JSON.stringify(fulfillmentManagerConfig, undefined, 2)
    )
  );

  fs.writeFileSync(
    ffmFile,
    `[${Keypair.fromSecretKey(fulfillmentManagerAccount.secretKey).secretKey}]`
  );
  console.log(toAccountString("ffmFile", ffmFile));

  // console.log("\n", toExportString("ffmFile", ffmFile));
}
