# 💸 tdex-daemon-alpha
Alpha Daemon implementation to execute automated market marking strategies on top of TDEX


## ⬇️ Install

* Install with **npm**

```sh
$ npm install -g tdex-daemon
```

* Download standalone binary (nodejs/npm not needed)

[Download latest release (Mac or Linux)](https://github.com/Sevenlab/tdex-daemon-alpha/releases) 

Move into a folder in your PATH (eg. `/usr/bin` or `/usr/local/bin`)


## 🏃‍♀️ Run

Once the daemon is launched it will create a data directory `~/.tdex-daemon` containing the default configuration file `config.json`.

It's possible to use a different path for the data directory with the environment variable `TDEX_DAEMON_PATH`

```sh
$ tdex-daemon
? How do you want to store your seed? 🔑 … 
❯ Encrypted (AES-128-CBC)
  Plain Text (not recommended)
```

It will be created a wallet for the daemon and stored in the chosen data directory in a file `vault.json`.

You can encrypt it with a password and if you decide to do so the daemon will save it encrypted and shutdown.

Then start again exporting the environment variable `TDEX_PASSWORD` with the chosen password so the daemon could automatically process incoming swap requests. 
> DO NOT FORGET THE PASSWORD, OR YOU WILL NOT BE ABLE TO RECOVER YOUR FUNDS

```sh
$ export TDEX_PASSWORD=ChosenPassword
$ tdex-daemon
info: Trader gRPC server listening on 0.0.0.0:9945
info: Operator gRPC server listening on 0.0.0.0:9000
```

If running on a VPS or the cloud, open the ports for the two gRPC interfaces.

## 💰 Deposit funds

To start a market, you need to deposit two reserves for the pair you are providing liquidity for. 
The initial ratio of two amounts you deposit will represent the starting price you give to that pair. 

From that point on, the **market making strategy will self regulate the trading price**.

You will also need to deposit in a different address an amount of LBTCs used by all markets to pay for transaction fees.

1. Download and install the [`tdex-cli`](https://github.com/Sevenlab/tdex-cli) 
2. Connect the CLI to the daemon with the gRPC **operator** interface. 
```sh
$ tdex-cli operator connect localhost:9000
```
3. Get the deposit address for the fee account and send some L-BTC
```
$ tdex-cli operator deposit --fee
```
4. Get the deposit address and send L-BTC and other Liquid assets to create and start a `market`
```sh
$ tdex-cli operator deposit
```
5. Profit! 


## 🛣 Roadmap

* [x] Swap protocol
* [x] Trade protocol
* [x] Wallet
* [x] Crawler
* [x] Market making

## 🖥 Local Development

Below is a list of commands you will probably find useful.

### `yarn start`

Runs the project without compiling TypeScript code into plain javascript.

### `yarn watch`

Runs the project in watch mode. Your project will be rebuilt upon changes.

### `yarn build`

Bundles the package to the `dist` folder.

### `yarn lint`

Try building the project and runs Eslint and Prettier

### `yarn test`

Runs the test watcher (Jest) in an interactive mode. Requires [Nigiri](https://nigiri.vulpem.com/#install) to already be installed.
