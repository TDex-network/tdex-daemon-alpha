import createLogger from './logger';
import winston from 'winston';
import Config, { ConfigInterface } from './config';
import DB from './datastore';

class App {
  logger: winston.Logger;
  config: ConfigInterface;
  datastore: any;

  constructor() {
    this.logger = createLogger();
    this.config = Config();
    this.datastore = new DB(this.config.datadir);

    process.on('SIGINT', () => {
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      this.shutdown();
    });
  }

  start() {
    setInterval(() => this.logger.info('Im a daemon always runnning'), 250);
  }

  shutdown() {
    this.logger.warn('Shutting down...');
    process.exit(0);
  }
}

export default App;
