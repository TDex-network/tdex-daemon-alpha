# 💸 tdex-daemon-alpha
Alpha Daemon implementation to execute automated market marking strategies on top of TDEX

## Usage

* Install with **npm**

```sh
$ npm install --g tdex-daemon
```

* Download standalone binary (nodejs/npm not needed)

[Download latest release (Mac or Linux)](https://github.com/Sevenlab/tdex-daemon-alpha/releases)

## 🛣 Roadmap

* [x] Swap protocol
* [x] Trade protocol
* [x] Wallet
* [x] Crawler
* [x] Market making

## 🖥 Local Development

Below is a list of commands you will probably find useful.

### yarn start

Runs the project without compiling TypeScript code into plain javascript.

### `yarn watch`

Runs the project in watch mode. Your project will be rebuilt upon changes.

### `yarn build`

Bundles the package to the `dist` folder.

### `yarn lint`

Try building the project and runs Eslint and Prettier

### `yarn test`

Runs the test watcher (Jest) in an interactive mode. Requires [Nigiri](https://nigiri.vulpem.com/#install) to already be installed.
