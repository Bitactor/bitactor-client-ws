import {MessageWrapper} from "../MessageWrapper";
import {PacketType} from "../../const/PacketType";

export class MessageData extends MessageWrapper {

    constructor(baseData: ArrayBuffer) {
        super(PacketType.TYPE_DATA, baseData);
    }

    buildMessageData(data: ArrayBuffer): MessageWrapper {
        return new MessageData(data)
    }
}