import {MessageWrapper} from "../MessageWrapper";
import {PacketType} from "../../const/PacketType";

export class MessageClose extends MessageWrapper {

    constructor() {
        super(PacketType.TYPE_CLOSE,null);
    }
}