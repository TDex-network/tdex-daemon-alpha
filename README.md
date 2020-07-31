# 💰 tdex-daemon-alpha
Alpha Daemon implementation to execute automated market marking strategies on top of TDEX


## Usage

In-depth documentation for running `tdex-daemon` is available at [docs.tdex.network](https://docs.tdex.network/tdex-daemon.html)

## 🛣 Roadmap

* [x] Swap protocol
* [x] Trade protocol
* [x] Wallet
* [x] Crawler
* [x] Constant Product Market making

## 🐳 Docker


### Build 

```sh
# Enter the project folder and install node dependencies
$ yarn install
# bundle for Linux amd64 
$ yarn build-linux
# Build docker image
$ docker build -t truedex/tdex-daemon:latest .
```

## 🌐 Browser support

To invoke TDEX trade grpc server from browser do as follows:

- Start tdex-daemon `yarn start`
- Download pre-build binary of grpcwebproxy from [here](https://github.com/improbable-eng/grpc-web/releases)
- Start gowebproxy `grpcwebproxy --backend_addr=localhost:9945 --run_tls_server=false --allow_all_origins`

You can also start it with docker:

```sh
$ docker run --name gwp --network host -t truedex/grpcwebproxy:latest --backend_addr=:9945 --run_tls_server=false --allow_all_origins 
```


## 🖥 Local Development

Below is a list of commands you will probably find useful for local development.

### `yarn start`

Runs the project without compiling TypeScript code into plain javascript.

### `yarn watch`

Runs the project in watch mode. Your project will be rebuilt upon changes.

### `yarn build`

Bundles the package to the `dist` folder.

### `yarn build-linux`

Build the TypeScript project and bundle with `Nexe` for Linux amd64 platform

### `yarn build-mac`

Build the TypeScript project and bundle with `Nexe` for Mac OS platform

### `yarn lint`

Try building the project and runs Eslint and Prettier

### `yarn test`

Runs the test watcher (Jest) in an interactive mode. Requires [Nigiri](https://nigiri.vulpem.com/#install) to already be installed.

