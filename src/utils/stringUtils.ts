import { PublicKey } from "@solana/web3.js";
import chalk from "chalk";

export const toAccountString = (
  label: string,
  publicKey: PublicKey | string | undefined
): string => {
  if (typeof publicKey === "string") {
    return `${chalk.blue(label.padEnd(24, " "))} ${chalk.yellow(publicKey)}`;
  }
  if (!publicKey) return "";
  return `${chalk.blue(label.padEnd(24, " "))} ${chalk.yellow(
    publicKey.toString()
  )}`;
};

export const toExportString = (
  label: string,
  value: string | PublicKey
): string => {
  return `\texport ${chalk.blue(label)}=${chalk.yellow(value)}`;
};
