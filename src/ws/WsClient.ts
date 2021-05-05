import {ICodec} from "./codec/ICodec";
import {MsgCodec} from "./codec/impl/MsgCodec";
import {MessageWrapper} from "./msg/MessageWrapper";
import {MessageAck} from "./msg/impl/MessageAck";
import {MessageHeartBeat} from "./msg/impl/MessageHeartBeat";
import {MessageClose} from "./msg/impl/MessageClose";
import {MessageHandShake} from "./msg/impl/MessageHandShake";
import {MessageConnectorData} from "./msg/impl/MessageConnectorData";
import {HandShakeData} from "./msg/HandShakeData";
import {SystemParamKeys} from "./const/SystemParamKeys";

const INT_MAX = 2147483647;

/**
 * @author WXH
 */
export class WsClient {
    codec: ICodec = new MsgCodec();
    connector!: WebSocket;
    address: string;
    timer!: number;
    msgId: number = 0;
    reconnect: boolean = false;
    reconnectTimes: number = 0;
    reconnectTimesMax: number = 5;
    reconnectPeriod: number = 1000;
    callback!: ((this: WsClient, msg: MessageConnectorData) => any);
    onComplete!: ((this: WsClient) => any) | null;
    onClose!: ((this: WsClient) => any) | null;
    onReconnect!: ((this: WsClient) => any) | null;
    onError!: ((this: WsClient, evt: any) => any) | null;
    handShakeData!: any;

    constructor(address: string, reconnect?: boolean, reconnectTimesMax?: number, reconnectPeriod?: number) {
        this.address = address;
        if (typeof reconnect === "boolean") {
            this.reconnect = reconnect;
        }
        if (reconnectTimesMax != null) {
            this.reconnectTimesMax = reconnectTimesMax;
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
        console.log("ws client error" + JSON.stringify(evt));
        if (this.onError) {
            this.onError.call(this, evt);
        }
    }

    /**
     * 异常处理处理器
     * @param evt
     */
    private closeHandler(evt: CloseEvent, justStop: boolean): void {
        this.stopHeartBeat(justStop);
        // 重连
        if (this.reconnect && !justStop && this.reconnectTimes < this.reconnectTimesMax) {
            console.log("ws client reconnect");
            setTimeout(() => {
                this.reconnectTimes++;
                if (this.onReconnect) {
                    this.onReconnect.call(this);
                }
                this.connect();
            }, this.reconnectPeriod)
        } else {
            console.log("ws client close");
            if (this.onClose) {
                this.onClose.call(this);
            }
        }
    }

    /**
     * 开始心跳消息
     */
    private startHeartBeat() {
        const openHeartbeat = Boolean(this.handShakeData.systemParameter[SystemParamKeys.HEARTBEAT_PERIOD_KEY]);
        if (openHeartbeat) {
            const heartBeatPeriod = Number(this.handShakeData.systemParameter[SystemParamKeys.HEARTBEAT_PERIOD_KEY]
                ? this.handShakeData.systemParameter[SystemParamKeys.HEARTBEAT_PERIOD_KEY]
                : "15000");
            console.log("heartBeatPeriod: " + heartBeatPeriod);
            this.timer = setInterval(() => {
                this.sendPack(new MessageHeartBeat(null));
            }, heartBeatPeriod);
        }

    }

    /**
     * 结束心跳消息
     */
    private stopHeartBeat(justStop: boolean) {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = 0;
        }
    }

    private receiveClose(close: MessageClose): void {
        this.closeHandler(new CloseEvent("custom_close"), true);
    }

    private receiveHandShack(handShake: MessageHandShake) {
        this.parseHandShakeData(handShake).then(handShakeData => {
            this.handShakeData = handShakeData;
            console.log("HandShakeData" + JSON.stringify(handShakeData));
            this.reconnectTimes = 0;
            this.startHeartBeat();
            if (this.onComplete) {
                this.onComplete.call(this);
            }
        })

    }

    public async parseHandShakeData(handShake: MessageHandShake): Promise<HandShakeData> {
        return new Promise<HandShakeData>(resolve => {
            try {
                if (handShake.baseData != null) {
                    const resBlob = new Blob([handShake.baseData])
                    const reader = new FileReader();
                    reader.readAsText(resBlob, "utf-8");
                    reader.onload = () => {
                        try {
                            if (typeof reader.result === "string") {
                                const res = JSON.parse(reader.result);
                                console.log("handShakeData =>" + Number(res.systemParameter["heartbeat.timeout"]));
                                resolve(res);
                            } else {
                                resolve(new HandShakeData());
                            }
                        } catch (e) {
                            resolve(new HandShakeData());
                        }
                    };

                } else {
                    resolve(new HandShakeData());
                }
            } catch (e) {
                resolve(new HandShakeData());
            }
        });
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
