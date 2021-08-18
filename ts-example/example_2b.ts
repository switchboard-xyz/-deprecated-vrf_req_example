import {
  Account,
  Cluster,
  clusterApiUrl,
  Connection,
  Context,
  PublicKey,
  SignatureResult,
} from "@solana/web3.js";
import {
  AggregatorState,
  parseAggregatorAccountData,
  updateFeed
} from "@switchboard-xyz/switchboard-api";
import * as fs from "fs";
import resolve from "resolve-dir";
import yargs from "yargs/yargs";
import { EventEmitter } from "events";
import { waitFor } from "wait-for-event";

let argv = yargs(process.argv).options({
  'updateAuthPubkey': {
    type: 'string',
    describe: 'The public key of the auth account permitting data feed updates.',
    demand: true,
  },
  'dataFeedPubkey': {
    type: 'string',
    describe: 'The public key of the data feed being updated.',
    demand: true,
  },
  'payerFile': {
    type: 'string',
    describe: 'Keypair file to pay for transactions.',
    demand: true,
  },
}).argv;

function toCluster(cluster: string): Cluster {
  switch (cluster) {
    case "devnet":
    case "testnet":
    case "mainnet-beta": {
      return cluster;
    }
  }
  throw new Error("Invalid cluster provided.");
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let cluster = 'devnet';
  let url = clusterApiUrl(toCluster(cluster), true);
  let connection = new Connection(url, 'processed');
  let payerKeypair = JSON.parse(fs.readFileSync(resolve(argv.payerFile), 'utf-8'));
  let payerAccount = new Account(payerKeypair);
  let dataFeedPubkey = new PublicKey(argv.dataFeedPubkey);
  let updateAuthPubkey = new PublicKey(argv.updateAuthPubkey);
  let signature = await updateFeed(
    connection,
    payerAccount, 
    dataFeedPubkey,
    updateAuthPubkey
  );
  console.log("Awaiting update transaction finalization...");
  let emitter = new EventEmitter();
  let callback = async function (signatureResult: SignatureResult, ctx: Context) {
    let attempts = 30;
    while (attempts--) {
      let state: AggregatorState = await parseAggregatorAccountData(connection, dataFeedPubkey);
      if (state.currentRoundResult.numSuccess + state.currentRoundResult.numError !== 0) {
        console.log(`(${dataFeedPubkey.toBase58()}) state.\n`,
                    JSON.stringify(state.toJSON(), null, 2));
        break;
      }
      // It may take a few more seconds for the oracle response to be processed.
      await sleep(1_000);
    }
    emitter.emit("Done");
  };
  connection.onSignature(signature, callback, 'processed');
  await waitFor("Done", emitter);
}

main().then(
  () => process.exit(),
  err => {
    console.error("Failed to complete action.");
    console.error(err);
    process.exit(-1);
  },
);
