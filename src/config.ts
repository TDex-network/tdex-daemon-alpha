import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isValidUrl } from './utils';
import { Logger } from 'winston';

export interface ConfigInterface {
  datadir: string;
  network: string;
  explorer: any;
  grpcOperator: any;
  grpcTrader: any;
  market: any;
  tickers: any;
}

const EXPLORER_API = {
  liquid: 'https://blockstream.info/liquid/api',
  regtest: 'https://nigiri.network/liquid/api',
};

function isValidFee(fee: number) {
  if (fee && typeof fee === 'number' && fee > 0 && fee < 1) return true;

  return false;
}

function defaultConfig(logger: Logger, opts: any): any {
  const network = opts.regtest ? 'regtest' : 'liquid';

  let fee = opts.fee;
  let explorer = { ...EXPLORER_API, [network]: opts.explorer };
  if (!isValidFee(opts.fee)) {
    fee = 0.25;
    opts.fee !== undefined &&
      logger.warn(`Given fee is not valid. Default ${fee}`);
  }
  if (!isValidUrl(opts.explorer)) {
    explorer = EXPLORER_API;
    opts.explorer !== undefined &&
      logger.warn(
        `Given explorer URL is not valid. Default: ${explorer[network]}`
      );
  }

  return {
    network,
    explorer,
    grpcOperator: {
      host: '0.0.0.0',
      port: '9000',
    },
    grpcTrader: {
      host: '0.0.0.0',
      port: '9945',
    },
    market: {
      fee,
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

export default function Config(logger: Logger, options: any): ConfigInterface {
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
    const config = defaultConfig(logger, options);
    const serialized = JSON.stringify(config, undefined, 2);
    fs.writeFileSync(configPath, serialized, { encoding: 'utf8', flag: 'w' });
  } else if (Object.keys(options).length > 0) {
    logger.warn(
      `Configuration file already exists at path ${datadir}. Given arguments will be discarded`
    );
  }

  let configObject: any;
  try {
    const read = fs.readFileSync(configPath, 'utf8');
    configObject = JSON.parse(read);
  } catch (e) {
    throw 'Invalid config file at path ' + configPath;
  }

  // Enrich config interface with current datadir
  return {
    datadir,
    ...configObject,
  };
}
