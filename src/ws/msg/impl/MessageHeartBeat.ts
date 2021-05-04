import {MessageWrapper} from "../MessageWrapper";
import {PacketType} from "../../const/PacketType";

export class MessageHeartBeat extends MessageWrapper {

  constructor(baseData: ArrayBuffer | null) {
    super(PacketType.TYPE_HEARTBEAT, baseData);
  }
}
