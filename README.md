Starter repo for all things Switchboard.

# Prerequisites
1. Install node 12: https://nodejs.org/en/download/package-manager/
1. Docker compose: https://docs.docker.com/compose/install/
1. ts-node: https://www.npmjs.com/package/ts-node
1. cargo: https://doc.rust-lang.org/cargo/getting-started/installation.html
1. solana cli https://docs.solana.com/cli/install-solana-cli-tools

# Example 1: Calling a Data Feed

In this example, we will post an example Solana program that will parse and
print a provided data feed.

```shell
cd "$(git rev-parse --show-toplevel)/example-program"
# Build example program
cargo build-bpf --manifest-path=Cargo.toml --bpf-out-dir=$PWD
# Publish example program (NOTE: you may need to replace switchboard_example.so with libswitchboard_example.so)
PROGRAM_PUBKEY=$(solana program deploy switchboard_example.so | tee /dev/tty | grep "Program Id:" | awk '{print $NF}')
cd ../ts-example
# Create and fund a payer account for the example
solana-keygen new --outfile example-keypair.json
solana airdrop 5 example-keypair.json
# Choose a feed to use in your program
# Find Data Feed Pubkeys at https://switchboard.xyz/#/explorer
FEED_PUBKEY="<YOUR FEED PUBKEY HERE>"
# Install dependencies and run the example
npm i
ts-node example_1.ts --payerFile=example-keypair.json --programPubkey=${PROGRAM_PUBKEY?} --dataFeedPubkey=${FEED_PUBKEY?}
# EXTRA: If you want to keep the compute units low when getting the result of the aggregator, use the PARSE_OPTIMIZED mirror account instead
OPTIMIZED_RESULT_PUBKEY="<YOUR PUBKEY HERE>"
ts-node example_1.ts --payerFile=example-keypair.json --programPubkey=${PROGRAM_PUBKEY?} --dataFeedPubkey=${OPTIMIZED_RESULT_PUBKEY?}
```

# Example 2: Creating your own Data Feed

In this example, we will create our own data feed and spin up our own node to
fulfill aggregator jobs.

In part `a` of this example, we will:
1. Create a data feed.
1. Add an example job to the feed.
1. Create a fulfillment manager and link it to the data feed.
1. Run a Switchboard node on the new fulfillment manager.

In part `b` we will:
1. Call `update` on a Switchboard Feed.
1. Watch as the aggregator populates with results!

Part a (Run a Switchboard node on your Fulfillment Manager):
```shell
cd "$(git rev-parse --show-toplevel)/ts-example"
solana airdrop 5 example-keypair.json
ts-node example_2a.ts --payerFile=example-keypair.json
export FULFILLMENT_MANAGER_KEY=<FULFILLMENT MANAGER KEY HERE>
export AUTH_KEY=<AUTH KEY HERE>
docker-compose up
```

Part b:
```shell
FEED_PUBKEY=<FEED PUBKEY HERE>
UPDATE_AUTH_KEY=<UPDATE AUTH PUBKEY HERE>
ts-node example_2b.ts --payerFile=example-keypair.json \
  --dataFeedPubkey=${FEED_PUBKEY?} --updateAuthPubkey=${UPDATE_AUTH_KEY?}
```
# vrf_req_example
