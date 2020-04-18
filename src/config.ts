import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface ConfigInterface {
  network: string;
  grpcOperator: any;
  grpTrader: any;
  market: any;
  tickers: any;
}

function defaultConfig(): any {
  return {
    network: 'regtest',
    grpcOperator: {
      host: 'localhost',
      port: '9000',
    },
    grpcTrader: {
      host: 'localhost',
      port: '9945',
    },
    market: {
      fee: 0.25,
      baseAsset: {
        liquid:
          '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d',
        regtest:
          '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
      },
    },
    tickers: {
      '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d':
        'L-BTC',
      '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225':
        'L-BTC',
    },
  };
}

function defaultDatadir(): string {
  const homedir = os.homedir();
  return path.join(homedir, '.tdex-daemon');
}

export default function Config(): ConfigInterface {
  let datadir: string;
  const { TDEX_DAEMON_PATH } = process.env;
  if (TDEX_DAEMON_PATH) {
    if (!path.isAbsolute(TDEX_DAEMON_PATH)) throw 'Path must be absolute';

    datadir = path.resolve(TDEX_DAEMON_PATH);
  } else {
    if (!fs.existsSync(defaultDatadir())) {
      fs.mkdirSync(defaultDatadir());
    }

    datadir = defaultDatadir();
  }

  const configPath = path.join(datadir, 'config.json');
  if (!fs.existsSync(configPath)) {
    const config = defaultConfig();
    const serialized = JSON.stringify(config, undefined, 2);
    fs.writeFileSync(configPath, serialized, { encoding: 'utf8', flag: 'w' });
  }

  let configObject: any;
  try {
    const read = fs.readFileSync(configPath, 'utf8');
    configObject = JSON.parse(read);
  } catch (e) {
    throw 'Invalid config file at path ' + configPath;
  }

  return configObject;
}
