import * as grpc from 'grpc';

import * as services from '../../../src/proto/operator_grpc_pb';
import * as messages from '../../../src/proto/operator_pb';

const operatorClient = new services.OperatorClient(
  'localhost:9000',
  grpc.credentials.createInsecure()
);

export function feeDepositAddress(): Promise<any> {
  return new Promise((resolve, reject) => {
    operatorClient.feeDepositAddress(
      new messages.FeeDepositAddressRequest(),
      (err, response) => {
        if (err) return reject(err);
        resolve(response!.getAddress());
      }
    );
  });
}

export function depositAddress(): Promise<any> {
  return new Promise((resolve, reject) => {
    operatorClient.depositAddress(
      new messages.DepositAddressRequest(),
      (err, response) => {
        if (err) return reject(err);
        resolve(response!.getAddress());
      }
    );
  });
}
