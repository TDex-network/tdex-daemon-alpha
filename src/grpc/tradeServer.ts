import { Server, ServerCredentials } from 'grpc';
import { Logger } from 'winston';

import { TradeService, Trade } from '../services/tradeService';
import { DBInterface } from '../db/datastore';
import { VaultInterface } from '../components/vault';

export default class TradeServer {
  server!: Server;
  tradeService: Trade;

  constructor(
    private datastore: DBInterface,
    private vault: VaultInterface,
    private network: string,
    private explorer: string,
    private logger: Logger
  ) {
    this.tradeService = new Trade(
      this.datastore,
      this.vault,
      this.network,
      this.explorer
    );
  }

  // Beacause of https://github.com/grpc/grpc/issues/7031
  // to be able to start and stop a server  from code we need to
  // instantiate a new Server instance each time.
  listen(host: string, port: number): void {
    this.server = new Server();
    this.server.addService(TradeService, this.tradeService as any);

    const bindCode = this.server.bind(
      `${host}:${port}`,
      ServerCredentials.createInsecure()
    );

    if (bindCode === 0) throw new Error(`gRPC could not bind on port: ${port}`);

    this.server.start();
    this.logger.info(`Trader gRPC server listening on ${host}:${port}`);
  }

  close(): Promise<void> {
    return new Promise((resolve) =>
      this.server.tryShutdown(() => {
        this.logger.info('Trader gRPC server completed shutdown');
        // manually update the server status
        (this.server as any).started = false;
        resolve();
      })
    );
  }
}
