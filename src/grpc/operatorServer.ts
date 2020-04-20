import { Server, ServerCredentials } from 'grpc';
import { Logger } from 'winston';

import { Operator, OperatorService } from '../services/operatorService';
import { VaultInterface } from '../components/vault';
import { DBInterface } from '../db/datastore';
import { CrawlerInterface } from '../components/crawler';

export default class OperatorServer {
  server: Server;

  constructor(
    private datastore: DBInterface,
    private vault: VaultInterface,
    private crawler: CrawlerInterface,
    private network: string,
    private logger: Logger
  ) {
    this.server = new Server();
    const serviceImplementation = new Operator(
      this.datastore,
      this.vault,
      this.crawler,
      this.network
    );
    this.server.addService(OperatorService, serviceImplementation as any);
  }

  listen(host: string, port: number): void {
    const bindCode = this.server.bind(
      `${host}:${port}`,
      ServerCredentials.createInsecure()
    );

    if (bindCode === 0) throw new Error(`gRPC could not bind on port: ${port}`);

    this.server.start();
    this.logger.info(`Operator gRPC server listening on ${host}:${port}`);
  }

  close(): Promise<void> {
    return new Promise((resolve) =>
      this.server.tryShutdown(() => {
        this.logger.info('Operator gRPC server completed shutdown');
        resolve();
      })
    );
  }
}
