import {ProtoLength} from "../const/ProtoLength";

export class MessageWrapper {
  type: number;
  baseData: ArrayBuffer | null;

  constructor(type: number, baseData: ArrayBuffer | null) {
    this.type = type;
    this.baseData = baseData;
  }

  getAllBytesLength() {
    return ProtoLength.PACKET_TYPE_L + (this.baseData == null ? 0 : this.baseData.byteLength);
  }
}
