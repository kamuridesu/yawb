import { BufferJSON, initAuthCreds } from "@whiskeysockets/baileys";

import * as sqlite3 from "sqlite";
import pkg from 'sqlite3';
const { Database: Sqlite3Driver } = pkg;
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
            saveCreds: async () => { await this.write('creds', creds) },
            clear: async () => { await this.purgeKeys() },
            removeCreds: async () => { await this.purgeAll() },
            query: async (table: string, id: string) => {
                // console.log("============== QUERY ===============")
                return await this.selectItemById(table, id);
            }
        }
    }

}


export class StateSQLiteDB extends State {
    filename: string;

    constructor(config: { ["filename"]: string, ["table"]?: string }) {
        super();
        this.filename = config.filename;
        this.table = config.table ?? this.table;
    }

    async init() {
        this.db = await sqlite3.open({
            filename: this.filename,
            driver: Sqlite3Driver
        });
        await this.createTableIfNotExists(this.table);
        await this.ensureSession();
    }

    async makeSureTableExists(table: string) {
        if (this.allTables.includes(table)) {
            return true;
        }
        const tables: { [name: string]: string }[] | undefined = await this.db?.all(`SELECT name FROM sqlite_master WHERE type='table';`);
        if (tables == undefined) {
            this.createTableIfNotExists(table);
            return true;
        }
        if (this.allTables.includes(table)) {
            return true;
        }
        tables.filter(t => !this.allTables.includes(t.name)).forEach(t => {
            this.createTableIfNotExists(t.name);
        });
        return true;
    }

    async createTableIfNotExists(tableName: string) {
        this.databaseIsNull();
        await this.db?.run(`CREATE TABLE IF NOT EXISTS ${tableName} (
             id VARCHAR(255) PRIMARY KEY,
             value TEXT,
             session VARCHAR(255),
             timestamp TIMESTAMP DEFAIULT CURRENT_TIMESTAMP
        );`);
        this.allTables.push(tableName);
    }

    async selectItemById(table: string, id: string): Promise<SelectResultType> {
        this.databaseIsNull();
        return await this.db?.get(`SELECT * FROM ${this.table} WHERE id = ?`, [id]) as SelectResultType;
    }

    async read(id: string): Promise<any> {
        const data = await this.selectItemById(this.table, id);
        if (!data || !data.value) {
            return null;
        }
        return JSON.parse(data.value, BufferJSON.reviver);
    }

    async write(id: string, data: any): Promise<void> {
        this.databaseIsNull();
        // console.log("============== WRITE ===============: " + id)
        const fixed = JSON.stringify(data, BufferJSON.replacer);
        await this.db?.run(`INSERT INTO ${this.table} (
            id, value, session
         ) VALUES (?, ?, ?) 
         ON CONFLICT DO UPDATE SET value=?, timestamp=CURRENT_TIMESTAMP`,
            [id, fixed, this.session, fixed]);
    }

    async delete(id: string): Promise<void> {
        this.databaseIsNull();
        // console.log("============== DELETE ===============: " + `DELETE FROM ${this.table} WHERE id = '${id}'`)
        await this.db?.run(`DELETE FROM ${this.table} WHERE id = ?`, [id]);
    }

    async purgeAll(): Promise<void> {
        this.databaseIsNull();
        await this.db?.run(`DELETE FROM ${this.table} WHERE session = ${this.session}`);
    }

    async ensureSession(): Promise<void> {
        this.databaseIsNull();
        const result: SelectResultType = await this.db?.get(`SELECT * FROM ${this.table} WHERE id = ?`, ["creds"]);
        if (result == undefined) {
            await this.db?.run(`INSERT INTO ${this.table} (
                    id, value, session    
                ) VALUES (?, ?, ?)`,
                ['creds', JSON.stringify(initAuthCreds()), this.session]
            );
        }
    }

    async purgeKeys(): Promise<void> {
        this.databaseIsNull();
        await this.db?.run(`DELETE FROM ${this.table} WHERE session = ${this.session} AND id != ?`, ['creds']);
    }

    async deleteOldSessions(): Promise<void> {

    }

}
