import createLogger from './logger';
import winston from 'winston';
import Config, { ConfigInterface } from './config';

class App {
  logger: winston.Logger;
  config: ConfigInterface;

  constructor() {
    this.logger = createLogger();
    this.config = Config();

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
