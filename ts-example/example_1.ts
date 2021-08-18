import {
  Account,
  Cluster,
  clusterApiUrl,
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
  Context,
  SignatureResult,
} from "@solana/web3.js";
import {
  initAccount,
  SwitchboardAccountType,
  createOwnedStateAccount,
  SWITCHBOARD_DEVNET_PID,
  SwitchboardInstruction,
  VrfAccountData
} from "@switchboard-xyz/switchboard-api";
import fs from "fs";
import resolve from "resolve-dir";
import yargs from "yargs/yargs";
import { EventEmitter } from "events";
import { waitFor } from "wait-for-event";
const bs58 = require('bs58');

const PID = SWITCHBOARD_DEVNET_PID;

let argv = yargs(process.argv).options({
  'dataFeedPubkey': {
    type: 'string',
    describe: "Public key of the data feed to use.",
    demand: false,
  },
  'payerFile': {
    type: 'string',
    describe: "Keypair file to pay for transactions.",
    demand: true,
  },
  'vrfProducerFile': {
    type: 'string',
    describe: "Keypair file for vrf producer.",
    demand: false,
  },
  'fmFile': {
    type: 'string',
    describe: "Keypair file for vrf proof confirmations.",
    demand: false,
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

async function getVrfState(connection: Connection, vrfPubKey: PublicKey): Promise<VrfAccountData> {
  let accountInfo = await connection.getAccountInfo(vrfPubKey);
  console.log(accountInfo.data[0]);
  let state = VrfAccountData.decodeDelimited(accountInfo.data.slice(1));
  console.log(
    "(",
    vrfPubKey.toBase58(),
    ") state.\n",
    JSON.stringify(state.toJSON(), null, 2)
  );
  return state;
}

async function setVrfConfigs(connection: Connection, 
                             vrfAccount: Account,
                             producerAccount: Account,
                             fmAccount: Account,
                             payerAccount: Account) {

  let transactionInstruction1 = new TransactionInstruction({
    keys: [
      { pubkey: vrfAccount.publicKey, isSigner: true, isWritable: true },
      { pubkey: producerAccount.publicKey, isSigner: true, isWritable: false },
    ],
    programId: PID,
    data: Buffer.from(SwitchboardInstruction.encodeDelimited(SwitchboardInstruction.create({
      setVrfConfigsInstruction: SwitchboardInstruction.SetVrfConfigsInstruction.create({
        randomnessProducerPubkey: producerAccount.publicKey.toBytes()
      })
    })).finish())
  });
  let transactionInstruction2 = new TransactionInstruction({
    keys: [
      { pubkey: vrfAccount.publicKey, isSigner: true, isWritable: true },
      { pubkey: fmAccount.publicKey, isSigner: true, isWritable: false },
    ],
    programId: PID,
    data: Buffer.from(SwitchboardInstruction.encodeDelimited(SwitchboardInstruction.create({
      setVrfConfigsInstruction: SwitchboardInstruction.SetVrfConfigsInstruction.create({
        fmPubkey: fmAccount.publicKey.toBytes()
      })
    })).finish())
  });
  let transactionInstruction3 = new TransactionInstruction({
    keys: [
      { pubkey: vrfAccount.publicKey, isSigner: true, isWritable: true },
    ],
    programId: PID,
    data: Buffer.from(SwitchboardInstruction.encodeDelimited(SwitchboardInstruction.create({
      setVrfConfigsInstruction: SwitchboardInstruction.SetVrfConfigsInstruction.create({
        minProofConfirmations: 5,
        lockConfigs: true
      })
    })).finish())
  });

  console.log("Awaiting transaction confirmation...");
  let signature = await sendAndConfirmTransaction(
    connection, new Transaction()
    .add(transactionInstruction1)
    .add(transactionInstruction2)
    .add(transactionInstruction3),
  [
    payerAccount,
    vrfAccount,
    producerAccount,
    fmAccount,
  ]);
}

async function requestRandomness(connection: Connection, vrfAccount: Account, payerAccount: Account) {
  let transactionInstruction1 = new TransactionInstruction({
    keys: [
      { pubkey: vrfAccount.publicKey, isSigner: true, isWritable: true },
    ],
    programId: PID,
    data: Buffer.from(SwitchboardInstruction.encodeDelimited(SwitchboardInstruction.create({
      requestRandomnessInstruction: SwitchboardInstruction.RequestRandomnessInstruction.create({})
    })).finish())
  });
  let signature = await sendAndConfirmTransaction(
    connection, new Transaction()
    .add(transactionInstruction1),
    [
      payerAccount,
      vrfAccount,
    ]);
}

async function awaitRandomness(connection: Connection, vrfAccount: Account) {
  let attempts = 30;
  while (attempts--) {
    let state: VrfAccountData = await getVrfState(connection, vrfAccount.publicKey);
    if (state.value.length !== 0) {
      // console.log(`(${dataFeedPubkey.toBase58()}) state.\n`,
      // JSON.stringify(state.toJSON(), null, 2));
      break;
    }
    // It may take a few more seconds for the oracle response to be processed.
    await sleep(1_000);
  }
}

async function main() {
  // let tAccount = new Account(bs58.decode(""));
  // console.log(tAccount.publicKey.toBase58());
  // console.log(JSON.stringify(tAccount.secretKey));
  let cluster = 'devnet';
  let url = clusterApiUrl(toCluster(cluster), true);
  let connection = new Connection(url, 'processed');
  let payerKeypair = JSON.parse(fs.readFileSync(resolve(argv.payerFile), 'utf-8'));
  let fmKeypair = JSON.parse(fs.readFileSync(resolve(argv.fmFile), 'utf-8'));
  let fmAccount = new Account(fmKeypair);
  let vrfProducerKeypair = JSON.parse(fs.readFileSync(resolve(argv.vrfProducerFile), 'utf-8'));
  let vrfProducerAccount = new Account(vrfProducerKeypair);
  let payerAccount = new Account(payerKeypair);
  let vrfAccount = await createOwnedStateAccount(connection, payerAccount, 500, SWITCHBOARD_DEVNET_PID);
  await initAccount(connection, payerAccount, vrfAccount, SwitchboardAccountType.TYPE_VRF);
  await setVrfConfigs(connection, vrfAccount, vrfProducerAccount, fmAccount, payerAccount);
  await getVrfState(connection, vrfAccount.publicKey);
  await requestRandomness(connection, vrfAccount, payerAccount);
  await awaitRandomness(connection, vrfAccount);
}

main().then(
  () => process.exit(),
  err => {
    console.error("Failed to complete action.");
    console.error(err);
    process.exit(-1);
  },
);
