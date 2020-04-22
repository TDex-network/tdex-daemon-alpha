// GENERATED CODE -- DO NOT EDIT!

// package: 
// file: operator.proto

import * as operator_pb from "./operator_pb";
import * as grpc from "grpc";

interface IOperatorService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
  depositAddress: grpc.MethodDefinition<operator_pb.DepositAddressRequest, operator_pb.DepositAddressReply>;
  feeDepositAddress: grpc.MethodDefinition<operator_pb.FeeDepositAddressRequest, operator_pb.FeeDepositAddressReply>;
}

export const OperatorService: IOperatorService;

export class OperatorClient extends grpc.Client {
  constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
  depositAddress(argument: operator_pb.DepositAddressRequest, callback: grpc.requestCallback<operator_pb.DepositAddressReply>): grpc.ClientUnaryCall;
  depositAddress(argument: operator_pb.DepositAddressRequest, metadataOrOptions: grpc.Metadata | grpc.CallOptions | null, callback: grpc.requestCallback<operator_pb.DepositAddressReply>): grpc.ClientUnaryCall;
  depositAddress(argument: operator_pb.DepositAddressRequest, metadata: grpc.Metadata | null, options: grpc.CallOptions | null, callback: grpc.requestCallback<operator_pb.DepositAddressReply>): grpc.ClientUnaryCall;
  feeDepositAddress(argument: operator_pb.FeeDepositAddressRequest, callback: grpc.requestCallback<operator_pb.FeeDepositAddressReply>): grpc.ClientUnaryCall;
  feeDepositAddress(argument: operator_pb.FeeDepositAddressRequest, metadataOrOptions: grpc.Metadata | grpc.CallOptions | null, callback: grpc.requestCallback<operator_pb.FeeDepositAddressReply>): grpc.ClientUnaryCall;
  feeDepositAddress(argument: operator_pb.FeeDepositAddressRequest, metadata: grpc.Metadata | null, options: grpc.CallOptions | null, callback: grpc.requestCallback<operator_pb.FeeDepositAddressReply>): grpc.ClientUnaryCall;
}
