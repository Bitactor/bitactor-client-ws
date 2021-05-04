import {ProtoLength} from "../../const/ProtoLength";
import {MessageData} from "./MessageDatat";

export class MessageConnectorData extends MessageData {
    protoType: number;
    msgId: number;
    cmdId: number;
    data!: ArrayBuffer;

    constructor(baseData: ArrayBuffer, protoType: number, msgId: number, cmdId: number, data: ArrayBuffer) {
        super(baseData);
        this.protoType = protoType;
        this.msgId = msgId;
        this.cmdId = cmdId;
        this.data = data;
    }

    /**
     * 构建一个 MessageFrontData
     */
    static builderNotice(data: ArrayBuffer, protoType: number, cmdId: number): MessageConnectorData {
        return MessageConnectorData.builderBase(data, protoType, 0, cmdId);
    }

    /**
     * 构建一个 MessageFrontData
     */
    static builderBase(data: ArrayBuffer, protoType: number, msgId: number, cmdId: number): MessageConnectorData {
        const view = new DataView(new ArrayBuffer(ProtoLength.PROTO_TYPE_L + ProtoLength.MSG_ID_TYPE_L + ProtoLength.CMD_ID_TYPE_L + data.byteLength));
        view.setInt8(0, protoType);
        view.setInt32(1, msgId);
        view.setInt32(5, cmdId);
        const dataArray = new Int8Array(data);
        dataArray.forEach(function (value, index) {
            view.setInt8(9 + index, value);
        });
        return new MessageConnectorData(view.buffer, protoType, msgId, cmdId, data);
    }

    /**
     * 构建一个 MessageFrontData
     */
    static builderBuildFull(baseData: ArrayBuffer, data: ArrayBuffer, protoType: number, msgId: number, cmdId: number): MessageConnectorData {
        return new MessageConnectorData(baseData, protoType, msgId, cmdId, data);
    }


}
