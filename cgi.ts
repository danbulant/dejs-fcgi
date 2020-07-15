#!/home/dan/.deno/bin/deno run

import FCGI from "./fcgi.ts";
import Record, { RecordTypes } from "./records/index.ts";
import * as dejs from 'https://deno.land/x/dejs/mod.ts';

const server = Deno.listen({ port: 8990 });

const te = new TextEncoder;

function concatTypedArrays(a: any, b: any) { // a, b TypedArray of same type
    var c = new (a.constructor)(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
}

for await(const con of server) {
    var response = new Uint8Array(0);

    var data: {
        records: Record[],
        done: boolean
    } = {
        records: [],
        done: false
    };

    for await(var chunk of Deno.iter(con)) {
        response = concatTypedArrays(response, chunk);
        data = FCGI.parse(response);
        if(data.done) break;
    }

    if(!(data.done)) continue;

    var params = FCGI.parseNameValue(FCGI.getFullStream(data.records.filter(val => val.type === RecordTypes.PARAMS)));

    var stdin = FCGI.getFullStream(data.records.filter(val => val.type === RecordTypes.STDIN));
    // var inputData = FCGI.getFullStream(data.records.filter(val => val.type === RecordTypes.DATA));

    var status = 200;
    var headers = new Map<string, string>();
    headers.set("Content-type", "text/html");
    headers.set("X-powered-by", "Dejs-FCGI");
    var dataOutput = await dejs.renderFileToString(params.get("SCRIPT_FILENAME")!, {
        PARAMS: params,
        STDIN: stdin,

        setStatus(statusNumber: number) {
            status = statusNumber;
        },

        setHeader(header: string, value: string) {
            headers.set(header, value);
        }
    });

    var output = `${params.get("SERVER_PROTOCOL")!} ${status}\r\n${Array.from(headers).map(([a, b]) => `${a}: ${b}`).join("\r\n")}\r\n\r\n${dataOutput}`;

    var responseData = FCGI.write(te.encode(output),1);

    for(var buf of responseData.toBufferArray()) {
        await con.write(buf);
    }

    con.close();
}