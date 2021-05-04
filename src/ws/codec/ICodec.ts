import {MessageWrapper} from "../msg/MessageWrapper";

export interface ICodec {
    decode: (buffer: ArrayBuffer) => MessageWrapper;
    encode: (wrapper: MessageWrapper) => ArrayBuffer;
}