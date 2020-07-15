import Record, {RecordTypes} from "./records/index.ts";
const td = new TextDecoder;

function concatTypedArrays(a: any, b: any) { // a, b TypedArray of same type
    var c = new (a.constructor)(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
}

export default class FCGI {
    static FCGI_HEADER_LEN = 8;
    static FCGI_VERSION = 1;

    static FCGI_KEEP_CONN = 1;
    static FCGI_RESPONDER = 1;

    static parse(buffer: Uint8Array): {
        records: Record[],
        done: boolean
     } {
        var done = false;
        var records = [];
        while(buffer.length) {
            if(buffer[0] !== 1) throw new Error("Unsupported version" + buffer[0]);
            var type = buffer[1];
            var requestId = (buffer[2] << 8) + buffer[3];
            var contentLength = (buffer[4] << 8) + buffer[5];
            var paddingLength = buffer[6];
            // 7 reserved
            var contentData = buffer.slice(8, 8 + contentLength);
            
            records.push(new Record({
                type,
                requestId,
                contentLength,
                paddingLength,
                contentData
            }));

            if(type === RecordTypes.STDIN && contentLength === 0) done = true; // now app can respond

            buffer = buffer.slice(8 + contentLength + paddingLength);
        }
        return {
            records,
            done
        };
    }

    static write(buffer: Uint8Array, rid: number, error: boolean = false) {
        return new Record({
            requestId: rid,
            contentLength: buffer.length,
            paddingLength: 0,
            contentData: buffer,
            type: error ? RecordTypes.STDERR : RecordTypes.STDOUT
        });
    }

    static getFullStream(records: Record[]): Uint8Array {
        var content;
        for(var record of records) {
            if(content) {
                concatTypedArrays(content, record.contentData);
            } else {
                content = record.contentData;
            }
        }

        return content;
    }

    static parseNameValue(content: Uint8Array) {
        var data = new Map<string, string>();

        while(content.length) {
            var nameLength = content[0];
            if(nameLength >> 7) {
                nameLength += ((content[3] & 0x7f) << 24) + (content[2] << 16) + (content[1] << 8);
                content = content.slice(4);
            } else {
                content = content.slice(1);
            }
            var valueLength = content[0];
            if(valueLength >> 7) {
                valueLength += ((content[3] & 0x7f) << 24) + (content[2] << 16) + (content[1] << 8);
                content = content.slice(4);
            } else {
                content = content.slice(1);
            }
            var nameData = content.slice(0, nameLength);
            var valueData = content.slice(nameLength, nameLength + valueLength);
            data.set(td.decode(nameData), td.decode(valueData));

            content = content.slice(nameLength + valueLength);
        }

        return data;
    }
}