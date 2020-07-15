
export enum RecordTypes {
    BEGIN_REQUEST = 1,
    ABORT_REQUEST,
    END_REQUEST,
    PARAMS,
    STDIN,
    STDOUT,
    STDERR,
    DATA,
    GET_VALUES,
    GET_VALUES_RESULT,
    UNKNOWN_TYPE
}


export default class Record {
    //1 byte
    version: 1 = 1;

    //1 byte
    type: RecordTypes;

    //2 bytes
    requestId: number;

    //2bytes
    contentLength: number;
    //1 byte
    paddingLength: number;

    //contentLength bytes;
    contentData: any;

    constructor(data: {
        version?: 1,
        type: RecordTypes,
        requestId: number,
        contentLength: number,
        paddingLength: number,
        contentData: any
    }) {
        this.type = data.type;
        this.requestId = data.requestId;
        this.contentLength = data.contentLength;
        this.paddingLength = data.paddingLength;
        this.contentData = data.contentData;
    }

    get isManagement() {
        return this.requestId === 0;
    }

    toBufferArray(): Uint8Array[] {
        var bufArray = [];
        var content = this.contentData;

        while(true) {
            var small = content.slice(0, 65535);
            var buffer = new Uint8Array(8 + this.contentLength);
            buffer.set([
                this.version,
                this.type,
                (this.requestId >> 8) & 0xFF,
                this.requestId & 0xFF,
                (small.length >> 8) & 0xFF,
                small.length & 0xFF,
                0,
                0
            ]);
            buffer.set(small, 8);
            bufArray.push(buffer);

            content = content.slice(65535, content.length);

            if(!content.slice(65535, content.length).length) break;
        }
        return bufArray;
    }
}