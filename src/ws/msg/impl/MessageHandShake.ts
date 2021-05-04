import {MessageWrapper} from "../MessageWrapper";
import {PacketType} from "../../const/PacketType";

export class MessageHandShake extends MessageWrapper {

    constructor(baseData: ArrayBuffer) {
        super(PacketType.TYPE_HANDSHAKE,baseData);
    }
}