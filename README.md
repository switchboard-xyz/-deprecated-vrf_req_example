Repo to demo verifiable randomness generation on Solana.

# Prerequisites
1. Install node 12: https://nodejs.org/en/download/package-manager/
1. Docker compose: https://docs.docker.com/compose/install/
1. ts-node: https://www.npmjs.com/package/ts-node
1. cargo: https://doc.rust-lang.org/cargo/getting-started/installation.html
1. solana cli https://docs.solana.com/cli/install-solana-cli-tools

# Security
Randomness generation is produced by a `randomness producer` who holds the secret
key used for randomness generation. If the secret key used by the randomness
producer to generate the vrf was leaked, then, given a message, it will be possible
to predict the randomness value output.

In this vrf implementation, all randomness generation is formatted into strict messages
unique to a VRF account owner.  VRF messages are a combination of:

1. The VRF Account public key used in requesting randomness
1. A counter variable, incremented every randomness request
1. The last blockhash

## Consideration 1
If the current solana network leader were to acquire to VRF producer secret key,
they could opt to control transaction ordering to produce a blockhash
that would create more favorable randomness for themselves. The most recent
blockhash could be left out of the message but this opens up more risk for
consideration 2 below.

## Consideration 2
If the most recent blockhash were not included in randomness generation and
the randomness producer secret key leaked publicly, any party could
predict randomness generation well before requested.

## Design Decision
Given the above considerations and given Solanas block generation speed, attack
scope is more narrowed to include the most recent blockhash to minimize randomness
foresight on producer secret key leaks.


# Usage
The included example shows how to create a VRF account and link it to a provided
randomness producer and fulfillment group (which will act to verify VRF proofs)
`ts-node example.ts --payerFile=example-keypair.json --vrfProducerFile=vrf_producer_secret.json --fmFile=fm_secret.json`


# Additional Considerations and Improvements
Currently, a group of oracles come to consensus on whether a randomness generation
successfully verifies with the published proof.  This is due to the limitation
that trusted elliptic curve libraries are not formally compatible with Solana's
toolchain.  We are in the process of moving proof verification on chain rather
than differing to oracles to verify proofs.

This also brings the additional security consideration that randomness proofs
may be falsely verified on malicious oracle collusion events.

# Risk of VRF Account secret key leaking
Anyone with the VRF account secret key may request a new randomness value.
To avoid attackers from overwriting any randomness value to a more favorable
value for themselves, the VRF counter should be noted at time of request and
checked against when reading randomness. In future work, it may be a
configuration to disallow more than one randomness request per VRF account.
