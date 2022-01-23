# Switchboard V1 VRF Example

Example repo for creating and using a Switchboard V1 VRF Account.

**NOTE:** VRF V2 is in progress!

Check out our docs to learn more - [docs.switchboard.xyz/randomness](https://docs.switchboard.xyz/randomness)

## Install

```bash
git clone https://github.com/switchboard-xyz/vrf-example-v1.git
cd vrf-example-v1
npm install
npm run build
npm link
```

## Walk-Through

To request randomness on-chain, we need create the following Switchboard V1 accounts:

| Type                              | OutputFile                 | Definition                                                                                           |
| --------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Fulfillment Manager               | ffmAccount.json            | control permissions between our oracle and VRF account                                               |
| Fulfillment Manager Auth (Oracle) | oracleAuthAccount.json     | Authorize an account to heartbeat onchain and wait for fulfillment manager update request            |
| VRF Account                       | vrfAccount.json            | Store the onchain randomness value                                                                   |
| VRF Ffm Permit                    | vrfPermitAccount.json      | Permit our VRF account to use a fulfillment manager                                                  |
| VRF Producer Permit               | producerPermitAccount.json | Create a permit between our oracle and our VRF account to allow the oracle to fulfill update request |

**NOTE:** We are using the oracle's keypair as the VRF Producer. You will need to use the same payerKeypair for the producerPermitAccount as you used for oracleAuthAccount.

### Create a Fulfillment Manager Account

Create a new fulfillment manager and output the keypair to `ffmAccount.json`.

```bash
sb-vrf create-ffm \
    --payerFile ../payer-keypair.json
```

### Create a Fulfillment Manager Oracle

Create a new fulfillment manager oracle, authorizand it to heartbeat, and output the keypair to `oracleAuthAccount.json`.
This command will also auto-populate the `docker-compose.yml` file with the expected variables.

```bash
sb-vrf create-oracle \
    --payerFile ../payer-keypair.json \
    --ffmFile ffmAccount.json
```

### Start the Oracle

```bash
docker-compose up
```

### Create a VRF Account

Create a new VRF account and output the keypair to `vrfAccount.json`.

```bash
sb-vrf create-vrf \
    --payerFile ../payer-keypair.json
```

### Permit VRF Account to use Fulfillment Manager

Create a new permit account, which authorizes a VRF account to use a fulfillment manager, and output the keypair to `vrfPermitAccount.json`.

```bash
sb-vrf permit-vrf \
    --payerFile ../payer-keypair.json \
    --ffmFile ffmAccount.json \
    --vrfFile vrfAccount.json
```

### Permit Oracle to Fulfill VRF Update Request

Create a new permit account, which authorizes our oracle to fulfill VRF update request , and output the keypair to `producerPermitAccount.json`.

```bash
sb-vrf permit-vrf-producer \
    --payerFile ../payer-keypair.json \
    --vrfFile vrfAccount.json
```

### Request a New Randomness Value

Request a new randomness value from the fulfillment manager oracle.

```bash
sb-vrf request-vrf \
    --payerFile ../payer-keypair.json \
    --vrfFile vrfAccount.json \
    --vrfPermitFile vrfPermitAccount.json \
    --producerPermitFile producerPermitAccount.json
```

### Print a VRF Account

```bash
sb-vrf print-vrf \
    --vrfFile vrfAccount.json
```

### Read the VRF Value Onchain

First build the onchain example. You will need to have the Solana toolchain installed and configured for devnet.

```bash
npm run deploy:onchain
```

Then invoke the program and pass our VrfAccount to read the result and return a value between [0 - 25000).

```bash
sb-vrf read-onchain \
    --payerFile ../payer-keypair.json \
    --vrfFile vrfAccount.json
```
