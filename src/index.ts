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

async function main() {
  const app = new App();
  try {
    await app.start();
  } catch (err) {
    app.logger.error(err.message);
  }
}

if (!module.parent) {
  main();
}
