import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import { createFulfillmentManagerAuth } from "@switchboard-xyz/switchboard-api";
import fs from "node:fs";
import path from "node:path";
import { loadAccount, loadKeypair, toAccountString } from "../utils";

export const FULFILLMENT_MANAGER_AUTH_FILE = "oracleAuthAccount.json";

export async function createOracleAction(argv: any): Promise<void> {
  const ffmAuthFile = path.join(process.cwd(), FULFILLMENT_MANAGER_AUTH_FILE);
  if (fs.existsSync(ffmAuthFile)) {
    const ffmAuthAccount = loadKeypair(ffmAuthFile);
    console.log(
      toAccountString(
        "FulfillmentManagerAuth (Oracle)",
        ffmAuthAccount.publicKey
      )
    );
    throw new Error(`ffmAuthAccountFile already exists at ${ffmAuthFile}`);
  }
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const payerAccount = loadAccount(argv.payerFile);
  const ffmAccount = loadAccount(argv.ffmFile);

  const ffmAuthAccount = await createFulfillmentManagerAuth(
    connection,
    payerAccount,
    ffmAccount,
    payerAccount.publicKey,
    {
      authorizeHeartbeat: true,
      authorizeUsage: true,
    }
  );
  console.log(
    toAccountString("FulfillmentManagerAuth (Oracle)", ffmAuthAccount.publicKey)
  );

  fs.writeFileSync(
    ffmAuthFile,
    `[${Keypair.fromSecretKey(ffmAuthAccount.secretKey).secretKey}]`
  );
  console.log(toAccountString("oracleAuthAccountFile", ffmAuthFile));

  console.log(`writing docker-compose.yml file with env variables`);
  const dockerComposeString = `
version: "3.3"
services:
  switchboard:
    image: "switchboardlabs/node:dev-1-20-22a"
    network_mode: host
    restart: always
    secrets:
      - PAYER_SECRETS
    environment:
      - LIVE=1
      - CLUSTER=devnet
      - FULFILLMENT_MANAGER_KEY=${ffmAccount.publicKey}
      - FULFILLMENT_MANAGER_HEARTBEAT_AUTH_KEY=${ffmAuthAccount.publicKey}
secrets:
  PAYER_SECRETS:
    file: ${argv.payerFile}

  `;
  fs.writeFileSync("docker-compose.yml", dockerComposeString);
}
