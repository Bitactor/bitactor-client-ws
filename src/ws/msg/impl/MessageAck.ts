import {MessageWrapper} from "../MessageWrapper";
import {PacketType} from "../../const/PacketType";


export class MessageAck extends MessageWrapper{

    constructor() {
        super(PacketType.TYPE_ACK,null);
    }
}