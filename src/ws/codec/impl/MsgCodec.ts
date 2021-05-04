import {ICodec} from "../ICodec";
import {MessageWrapper} from "../../msg/MessageWrapper";
import {PacketType} from "../../const/PacketType";
import {MessageHandShake} from "../../msg/impl/MessageHandShake";
import {MessageAck} from "../../msg/impl/MessageAck";
import {MessageHeartBeat} from "../../msg/impl/MessageHeartBeat";
import {MessageClose} from "../../msg/impl/MessageClose";
import {MessageConnectorData} from "../../msg/impl/MessageConnectorData";

export class MsgCodec implements ICodec {

    decode(buffer: ArrayBuffer): MessageWrapper {
        let message!: MessageWrapper;
        const view = new DataView(buffer);
        if (view.byteLength > 0) {
            const type: number = view.getInt8(0);
            const baseData = view.buffer.slice(1, view.buffer.byteLength);
            message = this.buildMessage(type, baseData);
        }
        return message;
    }

    encode(wrapper: MessageWrapper): ArrayBuffer {
        const buffer = new ArrayBuffer(wrapper.getAllBytesLength());
        const view = new DataView(buffer);
        view.setInt8(0, wrapper.type);
        if (wrapper.baseData != null) {
            const dataArray = new Int8Array(wrapper.baseData);
            dataArray.forEach(function (value, index) {
                view.setInt8(1 + index, value);
            });
        }
        return view.buffer;
    }

    buildMessage(type: number, baseData: ArrayBuffer): MessageWrapper {
        let msg: MessageWrapper;
        switch (type) {
            case PacketType.TYPE_HANDSHAKE:
                msg = new MessageHandShake(baseData);
                break;
            case PacketType.TYPE_ACK:
                msg = new MessageAck();
                break;
            case PacketType.TYPE_HEARTBEAT:
                msg = new MessageHeartBeat(baseData);
                break;
            case PacketType.TYPE_DATA:
                msg = this.buildMessageData(baseData);
                break;
            case PacketType.TYPE_CLOSE:
                msg = new MessageClose();
                break;
            default:
                msg = new MessageWrapper(type, baseData);
        }

        return msg;
    }

    buildMessageData(baseData: ArrayBuffer): MessageWrapper {
        const view = new DataView(baseData);
        const protoType = view.getInt8(0);
        const msgId = view.getInt32(1);
        const commandId = view.getInt32(5);
        const data = baseData.slice(9, baseData.byteLength);
        return MessageConnectorData.builderBase(data, protoType, msgId, commandId);
    }
}
