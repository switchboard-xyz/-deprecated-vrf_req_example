import { Account, Cluster, clusterApiUrl, Connection } from "@solana/web3.js";
import {
  OracleJob,
  SWITCHBOARD_DEVNET_PID,
  addFeedJob,
  addFeedParseOptimizedAccount,
  createDataFeed,
  createFulfillmentManager,
  createFulfillmentManagerAuth,
  setDataFeedConfigs,
  setFulfillmentManagerConfigs,
} from "@switchboard-xyz/switchboard-api";
import * as fs from "fs";
import resolve from "resolve-dir";
import yargs from "yargs/yargs";

let argv = yargs(process.argv).options({
  'payerFile': {
    type: 'string',
    describe: "Keypair file to pay for transactions.",
    demand: true,
  },
  'feedSecretFile': {
    type: 'string',
    describe: "Keypair file to pay for transactions.",
    demand: false,
    default: null
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

async function main() {
  let cluster = 'devnet';
  let url = clusterApiUrl(toCluster(cluster), true);
  let PID = SWITCHBOARD_DEVNET_PID;
  let connection = new Connection(url, 'processed');
  let payerKeypair = JSON.parse(fs.readFileSync(resolve(argv.payerFile), 'utf-8'));
  let payerAccount = new Account(payerKeypair);
  console.log("# Creating aggregator...");
  let dataFeedAccount = null;
  if (argv.feedSecretFile != null) {
    let feedKeypair = JSON.parse(fs.readFileSync(resolve(argv.feedSecretFile), 'utf-8'));
    dataFeedAccount = new Account(feedKeypair);
    console.log(`export FEED_PUBKEY=${dataFeedAccount.publicKey}`);
  } else {
    dataFeedAccount = await createDataFeed(connection, payerAccount, PID);
    console.log(`export FEED_PUBKEY=${dataFeedAccount.publicKey}`);
    console.log("# Creating a parsed optimized mirror of the aggregator (optional)...");
    let poAccount = await addFeedParseOptimizedAccount(connection, payerAccount, dataFeedAccount, 1000);
    console.log(`export OPTIMIZED_RESULT_PUBKEY=${poAccount.publicKey}`);
    console.log("# Adding job to aggregator...");
    let jobAccount = await addFeedJob(connection, payerAccount, dataFeedAccount, [
      OracleJob.Task.create({
        httpTask: OracleJob.HttpTask.create({
          url: `https://www.binance.us/api/v3/ticker/price?symbol=BTCUSD`
        }),
      }),
      OracleJob.Task.create({
        jsonParseTask: OracleJob.JsonParseTask.create({ path: "$.price" }),
      }),
    ]);
    console.log(`export JOB_PUBKEY=${jobAccount.publicKey}`);
  }
  console.log("# Creating fulfillment manager...");
  let fulfillmentManagerAccount = await createFulfillmentManager(connection, payerAccount, PID);
  await setFulfillmentManagerConfigs(connection, payerAccount, fulfillmentManagerAccount, {
    "heartbeatAuthRequired": true,
    "usageAuthRequired": true,
    "lock": false
  });
  console.log(`export FULFILLMENT_MANAGER_KEY=${fulfillmentManagerAccount.publicKey}`);
  console.log("# Configuring aggregator...");
  await setDataFeedConfigs(connection, payerAccount, dataFeedAccount, {
    "minConfirmations": 1,
    "minUpdateDelaySeconds": 1,
    "fulfillmentManagerPubkey": fulfillmentManagerAccount.publicKey.toBuffer(),
    "lock": false
  });
  console.log(`# Creating authorization account to permit account `
              + `${payerAccount.publicKey} to join fulfillment manager ` +
                `${fulfillmentManagerAccount.publicKey}`);
  let authAccount = await createFulfillmentManagerAuth(
    connection,
    payerAccount,
    fulfillmentManagerAccount,
    payerAccount.publicKey, {
      "authorizeHeartbeat": true,
      "authorizeUsage": false
    });
  console.log(`export AUTH_KEY=${authAccount.publicKey}`);
  console.log(`# Creating authorization account for the data feed. This will be ` +
              `used in part 2b.`);
  let updateAuthAccount = await createFulfillmentManagerAuth(
    connection,
    payerAccount,
    fulfillmentManagerAccount,
    dataFeedAccount.publicKey, {
      "authorizeHeartbeat": false,
      "authorizeUsage": true
    });
  console.log(`export UPDATE_AUTH_KEY=${updateAuthAccount.publicKey}`);
}

main().then(
  () => process.exit(),
  err => {
    console.error("Failed to complete action.");
    console.error(err);
    process.exit(-1);
  },
);
