// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var src_proto_operator_pb = require('../../src/proto/operator_pb.js');

function serialize_DepositAddressReply(arg) {
  if (!(arg instanceof src_proto_operator_pb.DepositAddressReply)) {
    throw new Error('Expected argument of type DepositAddressReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_DepositAddressReply(buffer_arg) {
  return src_proto_operator_pb.DepositAddressReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_DepositAddressRequest(arg) {
  if (!(arg instanceof src_proto_operator_pb.DepositAddressRequest)) {
    throw new Error('Expected argument of type DepositAddressRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_DepositAddressRequest(buffer_arg) {
  return src_proto_operator_pb.DepositAddressRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var OperatorService = exports.OperatorService = {
  depositAddress: {
    path: '/Operator/DepositAddress',
    requestStream: false,
    responseStream: false,
    requestType: src_proto_operator_pb.DepositAddressRequest,
    responseType: src_proto_operator_pb.DepositAddressReply,
    requestSerialize: serialize_DepositAddressRequest,
    requestDeserialize: deserialize_DepositAddressRequest,
    responseSerialize: serialize_DepositAddressReply,
    responseDeserialize: deserialize_DepositAddressReply,
  },
};

exports.OperatorClient = grpc.makeGenericClientConstructor(OperatorService);
