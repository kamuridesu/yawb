import { existsSync } from "fs";
import { readFile, unlink, writeFile } from "fs/promises";

function convertArrayBufferToBuffer(data: ArrayBuffer): Buffer<ArrayBufferLike> {
    const buffer = Buffer.alloc(data.byteLength);
    const view = new Uint8Array(data);
    for (let i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}

export abstract class FileStorage {

    abstract exists(filename: string): Promise<boolean>;
    abstract delete(filename: string): Promise<void>;
    abstract read(filename: string): Promise<Buffer<ArrayBufferLike> | undefined>;
    abstract write(filename: string, data: string | Buffer<ArrayBufferLike> | ArrayBuffer): Promise<string>;

}

export class LocalFileStorage extends FileStorage {

    constructor() {
        super();
    }

    async write(filename: string, data: string | Buffer | ArrayBuffer) {
        if (!(typeof (data) === "string")) {
            if (data instanceof ArrayBuffer) {
                data = convertArrayBufferToBuffer(data);
            }
        }
        await writeFile(filename, data as string | Buffer);
        return filename;
    }

    async delete(filename: string) {
        await unlink(filename);
    }

    async exists(filename: string) {
        return existsSync(filename);
    }

    async read(filename: string) {
        if (!this.exists(filename)) {
            return undefined;
        }
        return await readFile(filename);
    }

}

export function BuildStorage() {
    switch (process.env.STORAGE_TYPE) {
        case "LOCAL":
            return new LocalFileStorage();
        default:
            return new LocalFileStorage();
    }
}

export type OpenFileMode = "write" | "readOnly" | "append";

export class File {
    name: string;
    private mode: OpenFileMode;
    private storage = BuildStorage();

    constructor(file: string, mode: OpenFileMode = "write") {
        this.name = file;
        this.mode = mode;
    }

    async read() {
        return await this.storage.read(this.name);
    }

    async delete() {
        await this.storage.delete(this.name);
    }

    async write(data: string | Buffer | ArrayBuffer) {
        if (this.mode == "readOnly") {
            throw new Error("File is in read only mode!");
        }
        if (!(typeof (data) === "string")) {
            if (data instanceof ArrayBuffer) {
                data = convertArrayBufferToBuffer(data);
            }
        }
        if (this.mode == "append") {
            let content = await this.read();
            if (!content) {
                content = Buffer.from("");
            }
            if (typeof (data) === "string") {
                return this.storage.write(this.name, content?.toString() + data);
            }
            return await this.storage.write(this.name, Buffer.concat([content, data as Buffer<ArrayBufferLike>]));
        }
        return await this.storage.write(this.name, data);
    }
}
