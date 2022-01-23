import { Account, Keypair } from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";

export const loadKeypair = (fsPath: string): Keypair => {
  const fullPath = fsPath.startsWith("/")
    ? fsPath
    : path.join(process.cwd(), fsPath);
  if (!fs.existsSync(fullPath))
    throw new Error(`failed to load keypair ${fullPath}`);
  return Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(fullPath, "utf8")))
  );
};

export const loadAccount = (fsPath: string): Account => {
  const fullPath = fsPath.startsWith("/")
    ? fsPath
    : path.join(process.cwd(), fsPath);
  if (!fs.existsSync(fullPath))
    throw new Error(`failed to load keypair ${fullPath}`);
  return new Account(
    new Uint8Array(JSON.parse(fs.readFileSync(fullPath, "utf8")))
  );
};
