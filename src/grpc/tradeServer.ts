import { Server, ServerCredentials } from '@grpc/grpc-js';
import { Logger } from 'winston';

import { TradeService, Trade } from '../services/tradeService';
import { DBInterface } from '../db/datastore';
import { VaultInterface } from '../components/vault';

export default class TradeServer {
  server: Server;

  constructor(
    private datastore: DBInterface,
    private vault: VaultInterface,
    private network: string,
    private explorer: string,
    private logger: Logger
  ) {
    this.server = new Server();
    const service = new Trade(
      this.datastore,
      this.vault,
      this.network,
      this.explorer,
      this.logger
    );
    this.server.addService(TradeService, service as any);
  }

  listen(host: string, port: number): void {
    this.server.bindAsync(
      `${host}:${port}`,
      ServerCredentials.createInsecure(),
      (err) => {
        if (err) throw new Error(`gRPC could not bind on port: ${port}`);
        this.server.start();
        this.logger.info(`Trader gRPC server listening on ${host}:${port}`);
      }
    );
  }

  close(): Promise<void> {
    return new Promise((resolve) =>
      this.server.tryShutdown(() => {
        this.logger.info('Trader gRPC server completed shutdown');
        resolve();
      })
    );
  }
}
