// GENERATED CODE -- DO NOT EDIT!

// package: 
// file: src/proto/operator.proto

import * as src_proto_operator_pb from "../../src/proto/operator_pb";
import * as grpc from "grpc";

interface IOperatorService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
  depositAddress: grpc.MethodDefinition<src_proto_operator_pb.DepositAddressRequest, src_proto_operator_pb.DepositAddressReply>;
  feeDepositAddress: grpc.MethodDefinition<src_proto_operator_pb.FeeDepositAddressRequest, src_proto_operator_pb.FeeDepositAddressReply>;
}

export const OperatorService: IOperatorService;

export class OperatorClient extends grpc.Client {
  constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
  depositAddress(argument: src_proto_operator_pb.DepositAddressRequest, callback: grpc.requestCallback<src_proto_operator_pb.DepositAddressReply>): grpc.ClientUnaryCall;
  depositAddress(argument: src_proto_operator_pb.DepositAddressRequest, metadataOrOptions: grpc.Metadata | grpc.CallOptions | null, callback: grpc.requestCallback<src_proto_operator_pb.DepositAddressReply>): grpc.ClientUnaryCall;
  depositAddress(argument: src_proto_operator_pb.DepositAddressRequest, metadata: grpc.Metadata | null, options: grpc.CallOptions | null, callback: grpc.requestCallback<src_proto_operator_pb.DepositAddressReply>): grpc.ClientUnaryCall;
  feeDepositAddress(argument: src_proto_operator_pb.FeeDepositAddressRequest, callback: grpc.requestCallback<src_proto_operator_pb.FeeDepositAddressReply>): grpc.ClientUnaryCall;
  feeDepositAddress(argument: src_proto_operator_pb.FeeDepositAddressRequest, metadataOrOptions: grpc.Metadata | grpc.CallOptions | null, callback: grpc.requestCallback<src_proto_operator_pb.FeeDepositAddressReply>): grpc.ClientUnaryCall;
  feeDepositAddress(argument: src_proto_operator_pb.FeeDepositAddressRequest, metadata: grpc.Metadata | null, options: grpc.CallOptions | null, callback: grpc.requestCallback<src_proto_operator_pb.FeeDepositAddressReply>): grpc.ClientUnaryCall;
}
