import { initAuthCreds } from "@whiskeysockets/baileys";

import * as sqlite3 from "sqlite";
import { AppDataSync, SelectResultType } from "./types.js";


export abstract class State {
    protected db?: sqlite3.Database;
    protected table: string = "states"
    protected session: string = ""
    protected allTables: string[] = []

    constructor() {

    }

    databaseIsNull() {
        if (this.db == undefined) {
            throw new Error("Database is not instantiated");
        }
    }

    private parseTimestamp(timestamp: number | string | Long) {
        if (typeof timestamp === 'string') {
            return parseInt(timestamp, 10);
        }
        return timestamp;
    }

    private allocate(s: string) {
        let p = s.length;
        if (!p) {
            return new Uint8Array(1);
        }
        let n = 0;
        while (--p % 4 > 1 && s.charAt(p) === "=") {
            ++n;
        }
        return new Uint8Array(Math.ceil(s.length * 3) / 4 - n).fill(0);
    }

    fromObject(sync: AppDataSync) {
        const fingerprint = {
            ...sync.fingerprint,
            deviceIndexes: Array.isArray(sync.fingerprint.deviceIndexes) ? sync.fingerprint.deviceIndexes : []
        };

        const message = {
            keyData: Array.isArray(sync.keyData) ? sync.keyData : new Uint8Array,
            fingerprint: {
                rawId: fingerprint.rawId || 0,
                currentIndex: fingerprint.currentIndex || 0,
                deviceIndexes: fingerprint.deviceIndexes
            },
            timestamp: this.parseTimestamp(sync.timestamp)
        };
        if (typeof sync.keyData === "string") {
            message.keyData = this.allocate(sync.keyData)
        }

        return message;
    }

    abstract createTableIfNotExists(tableName: string): Promise<void>;
    abstract deleteOldSessions(): Promise<void>;
    abstract ensureSession(): Promise<void>;
    abstract selectItemById(table: string, id: string): Promise<SelectResultType>;
    abstract read(id: string): Promise<any>;
    abstract write(id: string, data: any): Promise<void>;
    abstract delete(id: string): Promise<void>;
    abstract purgeKeys(): Promise<void>;
    abstract purgeAll(): Promise<void>;

    async asState() {
        const creds = (await this.read('creds')) || initAuthCreds;

        return {
            state: {
                creds,
                keys: {
                    get: async (type: string, ids: string[]) => {
                        // console.log("============== GET ===============")
                        const data: any = {};
                        for (const id of ids) {
                            let value = await this.read(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = this.fromObject(value);
                            }
                            data[id] = value;
                        }
                        return data;
                    },
                    set: async (data: any) => {
                        // console.log("============== SET ===============")
                        for (const cat in data) {
                            for (const id in data[cat]) {
                                const value = data[cat][id];
                                const name = `${cat}-${id}`;
                                if (value) {
                                    await this.write(name, value);
                                } else {
                                    await this.delete(name);
                                }
                            }
                        }
                    }
                }
            },
            saveCreds: async () => {
                // console.log("============== SAVE ===============")
                await this.write('creds', creds)
            },
            clear: async () => { 
                // console.log("============== CLEAR ===============")
                await this.purgeKeys() 
            },
            removeCreds: async () => {
                // console.log("============== REMOVE ===============") 
                await this.purgeAll() 
            },
            query: async (table: string, id: string) => {
                // console.log("============== QUERY ===============")
                return await this.selectItemById(table, id);
            }
        }
    }

}


