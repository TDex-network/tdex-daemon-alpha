import { Server, ServerCredentials } from 'grpc';
import { Logger } from 'winston';

import { TradeService, Trade } from './services/tradeService';

export default class TradeServer {
  server: Server;

  constructor(private logger: Logger) {
    this.server = new Server();
    this.server.addService(TradeService, new Trade());
  }

  listen(host: string, port: number): void {
    const bindCode = this.server.bind(
      `${host}:${port}`,
      ServerCredentials.createInsecure()
    );

    if (bindCode === 0) throw new Error(`gRPC could not bind on port: ${port}`);

    this.server.start();
    this.logger.info(`gRPC server listening on ${host}:${port}`);
  }

  close(): Promise<void> {
    return new Promise((resolve) =>
      this.server.tryShutdown(() => {
        this.logger.info('gRPC server completed shutdown');
        resolve();
      })
    );
  }
}
