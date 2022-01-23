import {
  clusterApiUrl,
  Connection,
  Keypair,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createOwnedStateAccount,
  initAccount,
  SwitchboardAccountType,
  SwitchboardInstruction,
  SWITCHBOARD_DEVNET_PID,
} from "@switchboard-xyz/switchboard-api";
import fs from "node:fs";
import path from "node:path";
import { loadAccount, toAccountString } from "../utils";

export const VRF_ACCOUNT_FILE = "vrfAccount.json";

export async function createVrfAccountAction(argv: any): Promise<void> {
  const vrfFile = path.join(process.cwd(), VRF_ACCOUNT_FILE);
  if (fs.existsSync(vrfFile)) {
    throw new Error(`vrfAccountFile already exists at ${vrfFile}`);
  }
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const payerAccount = loadAccount(argv.payerFile);

  const vrfAccount = await createOwnedStateAccount(
    connection,
    payerAccount,
    1000,
    SWITCHBOARD_DEVNET_PID
  );
  await initAccount(
    connection,
    payerAccount,
    vrfAccount,
    SwitchboardAccountType.TYPE_VRF
  );
  const transactionInstruction1 = new TransactionInstruction({
    keys: [{ pubkey: vrfAccount.publicKey, isSigner: true, isWritable: true }],
    programId: SWITCHBOARD_DEVNET_PID,
    data: Buffer.from(
      SwitchboardInstruction.encodeDelimited(
        SwitchboardInstruction.create({
          setVrfConfigsInstruction:
            SwitchboardInstruction.SetVrfConfigsInstruction.create({
              minProofConfirmations: 1,
              lockConfigs: true, // must be locked before requesting randomness
            }),
        })
      ).finish()
    ),
  });
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(transactionInstruction1),
    [payerAccount, vrfAccount]
  );
  console.log(toAccountString("VrfAccount", vrfAccount.publicKey));

  // const transactionInstruction = new TransactionInstruction({
  //   keys: [{ pubkey: vrfAccount.publicKey, isSigner: true, isWritable: true }],
  //   programId: SWITCHBOARD_DEVNET_PID,
  //   data: Buffer.from(
  //     SwitchboardInstruction.encodeDelimited(
  //       SwitchboardInstruction.create({
  //         setVrfConfigsInstruction:
  //           SwitchboardInstruction.SetVrfConfigsInstruction.create({
  //             minProofConfirmations: 0,
  //           }),
  //       })
  //     ).finish()
  //   ),
  // });

  // await sendAndConfirmTransaction(
  //   connection,
  //   new Transaction().add(transactionInstruction),
  //   [payerAccount, vrfAccount]
  // );

  fs.writeFileSync(
    vrfFile,
    `[${Keypair.fromSecretKey(vrfAccount.secretKey).secretKey}]`
  );
  console.log(toAccountString("vrfAccountFile", vrfFile));

  // console.log("\n", toExportString("vrfFile", vrfFile));
}
