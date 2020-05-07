#!/usr/bin/env node

/**
Liquidity providers can spin up the alpha-daemon with custom configuration file, which has the following features:
  0. Load from Seed/Create Seed
  1. Deposit funds to create balanced reserves for each pair
  2. Start/stop trading
  3. Let traders connect and fetch balances for selected pair (market rate)
  4. Allows swap to be initiated and concluded
  5. Calculate the following market rate via constant product formula
 */
import App from './app';

const options = require('yargs') // eslint-disable-line
  .option('regtest', {
    alias: 'r',
    type: 'boolean',
    default: false,
    description: 'Run in regtest mode',
  })
  .option('fee', {
    alias: 'f',
    type: 'number',
    default: 0.25,
    description: 'Specify a default fee to be used by markets',
  })
  .option('explorer', {
    alias: 'e',
    type: 'string',
    description: 'Specify an Electrs HTTP REST endpoint',
  }).argv;

async function main() {
  const app = new App(options);
  try {
    await app.start();
  } catch (err) {
    app.logger.error(err.message);
  }
}

if (!module.parent) {
  main();
}
