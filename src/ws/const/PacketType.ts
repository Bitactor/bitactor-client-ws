export enum PacketType {
    TYPE_HANDSHAKE = 0X01,
    TYPE_ACK = 0x02,
    TYPE_HEARTBEAT = 0X03,
    TYPE_DATA = 0X04,
    TYPE_CLOSE = 0X10,
}