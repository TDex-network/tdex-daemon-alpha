import * as grpc from '@grpc/grpc-js';

import * as services from 'tdex-protobuf/js/operator_grpc_pb';
import * as messages from 'tdex-protobuf/js/operator_pb';

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
