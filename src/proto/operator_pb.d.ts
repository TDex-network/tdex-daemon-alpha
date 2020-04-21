// package: 
// file: src/proto/operator.proto

import * as jspb from "google-protobuf";

export class DepositAddressRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DepositAddressRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DepositAddressRequest): DepositAddressRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: DepositAddressRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DepositAddressRequest;
  static deserializeBinaryFromReader(message: DepositAddressRequest, reader: jspb.BinaryReader): DepositAddressRequest;
}

export namespace DepositAddressRequest {
  export type AsObject = {
  }
}

export class DepositAddressReply extends jspb.Message {
  getAddress(): string;
  setAddress(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DepositAddressReply.AsObject;
  static toObject(includeInstance: boolean, msg: DepositAddressReply): DepositAddressReply.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: DepositAddressReply, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DepositAddressReply;
  static deserializeBinaryFromReader(message: DepositAddressReply, reader: jspb.BinaryReader): DepositAddressReply;
}

export namespace DepositAddressReply {
  export type AsObject = {
    address: string,
  }
}

export class FeeDepositAddressRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): FeeDepositAddressRequest.AsObject;
  static toObject(includeInstance: boolean, msg: FeeDepositAddressRequest): FeeDepositAddressRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: FeeDepositAddressRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): FeeDepositAddressRequest;
  static deserializeBinaryFromReader(message: FeeDepositAddressRequest, reader: jspb.BinaryReader): FeeDepositAddressRequest;
}

export namespace FeeDepositAddressRequest {
  export type AsObject = {
  }
}

export class FeeDepositAddressReply extends jspb.Message {
  getAddress(): string;
  setAddress(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): FeeDepositAddressReply.AsObject;
  static toObject(includeInstance: boolean, msg: FeeDepositAddressReply): FeeDepositAddressReply.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: FeeDepositAddressReply, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): FeeDepositAddressReply;
  static deserializeBinaryFromReader(message: FeeDepositAddressReply, reader: jspb.BinaryReader): FeeDepositAddressReply;
}

export namespace FeeDepositAddressReply {
  export type AsObject = {
    address: string,
  }
}

