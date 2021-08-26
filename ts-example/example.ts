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
  SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
} from "@solana/web3.js";
import {
  initAccount,
  SwitchboardAccountType,
  createOwnedStateAccount,
  SWITCHBOARD_DEVNET_PID,
  SwitchboardInstruction,
  VrfAccountData,
  publishSwitchboardAccount
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

async function createVrfPermit(
  connection: Connection,
  payer: Account,
  vrfPubKey: PublicKey,
  granter: Account): Promise<Account> {
  let permitAccount = new Account();
  let pid = (await connection.getAccountInfo(vrfPubKey))?.owner;
  await publishSwitchboardAccount(connection, permitAccount, payer, pid, SwitchboardAccountType.TYPE_VRF_PERMIT, 250);

  let transactionInstruction = new TransactionInstruction({
    keys: [
      { pubkey: permitAccount.publicKey, isSigner: true, isWritable: true },
      { pubkey: granter.publicKey, isSigner: true, isWritable: false },
      { pubkey: vrfPubKey, isSigner: false, isWritable: false },
    ],
    programId: PID,
    data: Buffer.from(SwitchboardInstruction.encodeDelimited(SwitchboardInstruction.create({
      setVrfPermitInstruction: SwitchboardInstruction.SetVrfPermitInstruction.create({
        enabled: true
      })
    })).finish())
  });

  let signature = await sendAndConfirmTransaction(
    connection, new Transaction()
    .add(transactionInstruction),
  [
    payer,
    permitAccount,
    granter
  ]);
  return permitAccount;
}

async function getVrfState(connection: Connection, vrfPubKey: PublicKey): Promise<VrfAccountData> {
  let accountInfo = await connection.getAccountInfo(vrfPubKey);
  let state = VrfAccountData.decodeDelimited(accountInfo.data.slice(1));
  return state;
}

async function setVrfConfigs(connection: Connection, 
                             vrfAccount: Account,
                             producerAccount: Account,
                             fmAccount: Account,
                             payerAccount: Account) {

  let transactionInstruction = new TransactionInstruction({
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
    .add(transactionInstruction),
  [
    payerAccount,
    vrfAccount,
  ]);
}

async function requestRandomness(connection: Connection, vrfAccount: Account, payerAccount: Account, vrfProducerPubkey: PublicKey, fmPubkey: PublicKey) {
  let transactionInstruction1 = new TransactionInstruction({
    keys: [
      { pubkey: vrfAccount.publicKey, isSigner: true, isWritable: true },
      { pubkey: SYSVAR_RECENT_BLOCKHASHES_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: vrfProducerPubkey, isSigner: false, isWritable: false },
      { pubkey: fmPubkey, isSigner: false, isWritable: false },
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
    if (state.numProofConfirmations >= state.minProofConfirmations) {
      break;
    }
    await sleep(1_000);
  }
}

async function main() {
  let cluster = 'devnet';
  let url = "https://stage.devnet.rpcpool.com"; //clusterApiUrl(toCluster(cluster), true);
  let connection = new Connection(url, 'processed');
  let payerKeypair = JSON.parse(fs.readFileSync(resolve(argv.payerFile), 'utf-8'));
  let fmKeypair = JSON.parse(fs.readFileSync(resolve(argv.fmFile), 'utf-8'));
  let fmAccount = new Account(fmKeypair);
  let vrfProducerKeypair = JSON.parse(fs.readFileSync(resolve(argv.vrfProducerFile), 'utf-8'));
  let vrfProducerAccount = new Account(vrfProducerKeypair);
  let payerAccount = new Account(payerKeypair);
  console.log("Creating vrf account");
  let vrfAccount = await createOwnedStateAccount(connection, payerAccount, 500, PID);
  await initAccount(connection, payerAccount, vrfAccount, SwitchboardAccountType.TYPE_VRF);
  console.log("Creating vrf permits");
  let vrfProducerPermit = await createVrfPermit(connection, payerAccount, vrfAccount.publicKey, vrfProducerAccount);
  let fmPermit = await createVrfPermit(connection, payerAccount, vrfAccount.publicKey, fmAccount);
  console.log("Setting vrf configs");
  await setVrfConfigs(connection, vrfAccount, vrfProducerAccount, fmAccount, payerAccount);
  console.log("Requesting randomness");
  await requestRandomness(connection, vrfAccount, payerAccount, vrfProducerPermit.publicKey, fmPermit.publicKey);
  console.log("Awaiting randomness...");
  await awaitRandomness(connection, vrfAccount);
  let state = await getVrfState(connection, vrfAccount.publicKey);
  console.log(
    "(",
    vrfAccount.publicKey.toBase58(),
    ") state.\n",
    JSON.stringify(state.toJSON(), null, 2)
  );
}

main().then(
  () => process.exit(),
  err => {
    console.error("Failed to complete action.");
    console.error(err);
    process.exit(-1);
  },
);
