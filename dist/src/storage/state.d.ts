import * as sqlite3 from "sqlite";
import { AppDataSync, SelectResultType } from "./types.js";
export declare abstract class State {
    protected db?: sqlite3.Database;
    protected table: string;
    protected session: string;
    constructor();
    databaseIsNull(): void;
    private parseTimestamp;
    private allocate;
    fromObject(sync: AppDataSync): {
        keyData: Uint8Array<ArrayBuffer>;
        fingerprint: {
            rawId: number;
            currentIndex: number;
            deviceIndexes: number[];
        };
        timestamp: number | import("long").Long;
    };
    abstract createTableIfNotExists(): Promise<void>;
    abstract deleteOldSessions(): Promise<void>;
    abstract ensureSession(): Promise<void>;
    abstract selectItemById(table: string, id: string): Promise<SelectResultType>;
    abstract read(id: string): Promise<any>;
    abstract write(id: string, data: any): Promise<void>;
    abstract delete(id: string): Promise<void>;
    abstract purgeKeys(): Promise<void>;
    abstract purgeAll(): Promise<void>;
}
export declare class StateSQLiteDB extends State {
    filename: string;
    constructor(config: {
        ["filename"]: string;
        ["table"]?: string;
    });
    init(): Promise<void>;
    createTableIfNotExists(): Promise<void>;
    selectItemById(table: string, id: string): Promise<SelectResultType>;
    read(id: string): Promise<any>;
    write(id: string, data: any): Promise<void>;
    delete(id: string): Promise<void>;
    purgeAll(): Promise<void>;
    ensureSession(): Promise<void>;
    purgeKeys(): Promise<void>;
    deleteOldSessions(): Promise<void>;
    asState(): Promise<{
        state: {
            creds: any;
            keys: {
                get: (type: string, ids: string[]) => Promise<any>;
                set: (data: any) => Promise<void>;
            };
        };
        saveCreds: () => Promise<void>;
        clear: () => Promise<void>;
        removeCreds: () => Promise<void>;
        query: (table: string, id: string) => Promise<SelectResultType>;
    }>;
}
