import {ICodec} from "../codec/ICodec";
import {MsgCodec} from "../codec/impl/MsgCodec";
import {MessageWrapper} from "../msg/MessageWrapper";
import {MessageAck} from "../msg/impl/MessageAck";
import {MessageHeartBeat} from "../msg/impl/MessageHeartBeat";
import {MessageClose} from "../msg/impl/MessageClose";
import {MessageHandShake} from "../msg/impl/MessageHandShake";
import {MessageConnectorData} from "../msg/impl/MessageConnectorData";

const INT_MAX = 2147483647;

export class WsClient {
    codec: ICodec = new MsgCodec();
    connector!: WebSocket;
    address: string;
    timer!: number;
    heartBeatPeriod: number = 15000;
    reconnectPeriod: number = 1000;
    msgId: number = 0;
    reconnect: boolean = false;
    callback!: ((this: WsClient, msg: MessageConnectorData) => any);
    onComplete!: ((this: WsClient) => any) | null;
    onClose!: ((this: WsClient) => any) | null;

    constructor(address: string, heartBeatPeriod?: number, reconnect?: boolean, reconnectPeriod?: number) {
        this.address = address;
        if (heartBeatPeriod != null) {
            this.heartBeatPeriod = heartBeatPeriod;
        }
        if (typeof reconnect === "boolean") {
            this.reconnect = reconnect;
        }
        if (reconnectPeriod != null) {
            this.reconnectPeriod = reconnectPeriod;
        }
    }

    public connect(): boolean {
        this.connector = new WebSocket(this.address);
        this.connector.binaryType = "arraybuffer";
        this.connector.onopen = (evt: Event) => {
            this.onConnect();
        };
        this.connector.onmessage = (evt: MessageEvent) => {
            this.msgHandler(evt);
        };
        this.connector.onerror = (evt: Event) => {
            this.errorHandler(evt);
        };
        this.connector.onclose = (evt: CloseEvent) => {
            this.closeHandler(evt, false);
        };
        this.msgId = 0;
        return true;
    }

    private onConnect(): void {
        // 发送消息 MessageAck
        this.sendPack(new MessageAck());
    }

    /**
     * 发送基础包
     * @param msg
     */
    private sendPack(msg: MessageWrapper): void {
        const buffer = this.codec.encode(msg);
        this.connector.send(buffer);
    }

    /**
     * 消息处理器
     * @param evt
     */
    private msgHandler(evt: MessageEvent): void {
        const messageWrapper = this.codec.decode(evt.data);
        if (messageWrapper instanceof MessageHandShake) {
            this.receiveHandShack(messageWrapper);
        } else if (messageWrapper instanceof MessageHeartBeat) {
            this.receiveHeartBeat(messageWrapper);
        } else if (messageWrapper instanceof MessageConnectorData) {
            this.receiveMessage(messageWrapper);
        } else if (messageWrapper instanceof MessageClose) {
            this.receiveClose(messageWrapper);
        } else {
            console.log("recv unknown pack" + JSON.stringify(messageWrapper))
        }

    }

    /**
     * 异常处理处理器
     * @param evt
     */
    private errorHandler(evt: Event): void {
        console.log("ws client error" + evt);
    }

    /**
     * 异常处理处理器
     * @param evt
     */
    private closeHandler(evt: CloseEvent, justStop: boolean): void {
        console.log("ws client close");
        this.stopHeartBeat(justStop);
        if (this.onClose) {
            this.onClose.call(this);
        }
    }

    /**
     * 开始心跳消息
     */
    private startHeartBeat() {
        this.timer = setInterval(() => {
            this.sendPack(new MessageHeartBeat(null));
        }, this.heartBeatPeriod);
    }

    /**
     * 结束心跳消息
     */
    private stopHeartBeat(justStop: boolean) {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = 0;
        }
        // 重连
        if (this.reconnect && !justStop) {
            setTimeout(() => {
                this.connect();
            }, this.reconnectPeriod)
        }
    }

    private receiveClose(close: MessageClose): void {
        this.closeHandler(new CloseEvent("custom_close"), true);
    }

    private receiveHandShack(handShake: MessageHandShake) {
        this.startHeartBeat();
        if (this.onComplete) {
            this.onComplete.call(this);
        }
    }

    private receiveHeartBeat(handShake: MessageHeartBeat) {
        // do nothing
    }

    private receiveMessage(msg: MessageConnectorData) {
        this.callback.call(this, msg);
    }

    /**
     * 发送数据包到服务服务端
     * @param protoType
     * @param cmdId
     * @param buffer
     */
    sendMsg(protoType: number, cmdId: number, buffer: ArrayBuffer): void {
        const message = MessageConnectorData.builderBase(buffer, protoType, this.getMsgId(), cmdId);
        this.sendPack(message);
    }

    private getMsgId(): number {
        if (this.msgId >= INT_MAX) {
            this.msgId = 0;
        }
        return ++this.msgId;
    }

    /**
     * 关闭服务
     */
    close() {
        this.sendPack(new MessageClose());
        this.connector.close()
    }
}
