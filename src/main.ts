#!/usr/bin/env node
import dotenv from "dotenv";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import {
  createFulfillmentManagerAction,
  createOracleAction,
  createVrfAccountAction,
  createVrfPermitAction,
  createVrfProducerPermitAction,
  printRandomnessAction,
  readOnchainResult,
  requestRandomnessAction,
} from "./actions";

dotenv.config();

async function main(): Promise<void> {
  const argv = yargs(hideBin(process.argv))
    .command(
      `create-ffm`,
      "create a fulfillment manager account",
      (yarg) => {
        yarg.options({
          payerFile: {
            type: "string",
            describe:
              "filesystem path of JSON file containing the solana account that will pay for the ffmAccount",
            demand: true,
          },
        });
      },
      createFulfillmentManagerAction
    )
    .command(
      `create-oracle`,
      "create and permit an oracle to use a fulfillment manager",
      (yarg) => {
        yarg.options({
          payerFile: {
            type: "string",
            describe:
              "filesystem path of JSON file containing the solana account that will pay for the ffmAccount",
            demand: true,
          },
          ffmFile: {
            type: "string",
            describe: "filesystem path of fulfillment manager keypair",
            default: "ffmAccount.json",
            demand: false,
          },
        });
      },
      createOracleAction
    )
    .command(
      `create-vrf`,
      "create a VRF account",
      (yarg) => {
        yarg.options({
          payerFile: {
            type: "string",
            describe:
              "filesystem path of solana account that will pay for the vrfAccount",
            demand: true,
          },
        });
      },
      createVrfAccountAction
    )
    .command(
      `permit-vrf`,
      "permit a vrf account to use a fulfillment manager",
      (yarg) => {
        yarg.options({
          payerFile: {
            type: "string",
            describe:
              "filesystem path of solana account that will pay for the permitAccount",
            demand: true,
          },
          ffmFile: {
            type: "string",
            describe: "filesystem path of fulfillment manager keypair",
            default: "ffmAccount.json",
            demand: false,
          },
          vrfFile: {
            type: "string",
            describe: "filesystem path of vrf keypair",
            default: "vrfAccount.json",
            demand: false,
          },
        });
      },
      createVrfPermitAction
    )
    .command(
      `permit-vrf-producer`,
      "permit an oracle to fulfill a vrf account's update request",
      (yarg) => {
        yarg.options({
          payerFile: {
            type: "string",
            describe:
              "filesystem path of solana account that will pay for the permitAccount",
            demand: true,
          },
          vrfFile: {
            type: "string",
            describe: "filesystem path of vrf keypair",
            default: "vrfAccount.json",
            demand: false,
          },
        });
      },
      createVrfProducerPermitAction
    )
    .command(
      `request-vrf`,
      "request randomness for a vrf account",
      (yarg) => {
        yarg.options({
          payerFile: {
            type: "string",
            describe:
              "filesystem path of solana account that will pay for the permitAccount",
            demand: true,
          },
          vrfFile: {
            type: "string",
            describe: "filesystem path of vrf keypair",
            default: "vrfAccount.json",
            demand: false,
          },
          vrfPermitFile: {
            type: "string",
            describe:
              "filesystem path of keypair that permits vrf account to use a fulfillment manager",
            default: "vrfPermitAccount.json",
            demand: false,
          },
          producerPermitFile: {
            type: "string",
            describe:
              "filesystem path of keypair that permits an oracle to fulfill a randomness request",
            default: "producerPermitAccount.json",
            demand: false,
          },
        });
      },
      requestRandomnessAction
    )
    .command(
      `print-vrf`,
      "read randomness value for a given vrfAccountFile",
      (yarg) => {
        yarg.options({
          vrfFile: {
            type: "string",
            describe: "filesystem path of the vrfAccount",
            default: "vrfAccount.json",
            demand: false,
          },
        });
      },
      printRandomnessAction
    )
    .command(
      `read-onchain`,
      "read randomness value onchain",
      (yarg) => {
        yarg.options({
          payerFile: {
            type: "string",
            describe:
              "filesystem path of solana account that will pay for the permitAccount",
            demand: true,
          },
          vrfFile: {
            type: "string",
            describe: "filesystem path of the vrfAccount",
            default: "vrfAccount.json",
            demand: false,
          },
        });
      },
      readOnchainResult
    )
    .parse();
}
main().then(
  () => {
    return;
  },
  (error) => {
    console.error(error);
    return;
  }
);

export {};
