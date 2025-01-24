import { BufferJSON, initAuthCreds } from "@whiskeysockets/baileys";
import * as sqlite3 from "sqlite";
import pkg from 'sqlite3';
const { Database: Sqlite3Driver } = pkg;
export class State {
    constructor() {
        this.table = "states";
        this.session = "session_";
    }
    databaseIsNull() {
        if (this.db == undefined) {
            throw new Error("Database is not instantiated");
        }
    }
    parseTimestamp(timestamp) {
        if (typeof timestamp === 'string') {
            return parseInt(timestamp, 10);
        }
        return timestamp;
    }
    allocate(s) {
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
    fromObject(sync) {
        const fingerprint = Object.assign(Object.assign({}, sync.fingerprint), { deviceIndexes: Array.isArray(sync.fingerprint.deviceIndexes) ? sync.fingerprint.deviceIndexes : [] });
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
            message.keyData = this.allocate(sync.keyData);
        }
        return message;
    }
}
export class StateSQLiteDB extends State {
    constructor(config) {
        var _a;
        super();
        this.filename = config.filename;
        this.table = (_a = config.table) !== null && _a !== void 0 ? _a : this.table;
    }
    async init() {
        this.db = await sqlite3.open({
            filename: this.filename,
            driver: Sqlite3Driver
        });
        await this.createTableIfNotExists();
        await this.ensureSession();
    }
    async createTableIfNotExists() {
        var _a;
        this.databaseIsNull();
        await ((_a = this.db) === null || _a === void 0 ? void 0 : _a.run(`CREATE TABLE IF NOT EXISTS ${this.table} (
             id VARCHAR(255) PRIMARY KEY,
             value TEXT,
             session VARCHAR(255),
             timestamp TIMESTAMP DEFAIULT CURRENT_TIMESTAMP
        );`));
    }
    async selectItemById(table, id) {
        var _a;
        this.databaseIsNull();
        return await ((_a = this.db) === null || _a === void 0 ? void 0 : _a.get(`SELECT * FROM ${this.table} WHERE id = ?`, [`${this.session}-${id}`]));
    }
    async read(id) {
        const data = await this.selectItemById(this.table, id);
        if (!data || !data.value) {
            return null;
        }
        return JSON.parse(data.value, BufferJSON.reviver);
    }
    async write(id, data) {
        var _a;
        this.databaseIsNull();
        const fixed = JSON.stringify(data, BufferJSON.replacer);
        await ((_a = this.db) === null || _a === void 0 ? void 0 : _a.run(`INSERT INTO ${this.table} (
            id, value, session
         ) VALUES (?, ?, ?) 
         ON CONFLICT DO UPDATE SET value=?, timestamp=CURRENT_TIMESTAMP`, [`${this.session}-${id}`, fixed, this.session, fixed]));
    }
    async delete(id) {
        var _a;
        this.databaseIsNull();
        await ((_a = this.db) === null || _a === void 0 ? void 0 : _a.run(`DELETE FROM ${this.table} WHERE id = ${this.session}-${id}`));
    }
    async purgeAll() {
        var _a;
        this.databaseIsNull();
        await ((_a = this.db) === null || _a === void 0 ? void 0 : _a.run(`DELETE FROM ${this.table} WHERE session = ${this.session}`));
    }
    async ensureSession() {
        var _a, _b;
        this.databaseIsNull();
        const result = await ((_a = this.db) === null || _a === void 0 ? void 0 : _a.get(`SELECT * FROM ${this.table} WHERE id = ?`, ["creds"]));
        if (result == undefined) {
            await ((_b = this.db) === null || _b === void 0 ? void 0 : _b.run(`INSERT INTO ${this.table} (
                    id, value, session    
                ) VALUES (?, ?, ?)`, ['creds', JSON.stringify(initAuthCreds()), this.session]));
        }
    }
    async purgeKeys() {
        var _a;
        this.databaseIsNull();
        await ((_a = this.db) === null || _a === void 0 ? void 0 : _a.run(`DELETE FROM ${this.table} WHERE session = ${this.session} AND id != ?`, ['creds']));
    }
    async deleteOldSessions() {
    }
    async asState() {
        const creds = (await this.read('creds')) || initAuthCreds;
        return {
            state: {
                creds,
                keys: {
                    get: async (type, ids) => {
                        const data = {};
                        for (const id of ids) {
                            let value = await this.read(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = this.fromObject(value);
                            }
                            data[id] = value;
                        }
                        return data;
                    },
                    set: async (data) => {
                        for (const cat in data) {
                            for (const id in data[cat]) {
                                const value = data[cat][id];
                                const name = `${cat}-${id}`;
                                if (value) {
                                    await this.write(name, value);
                                }
                                else {
                                    await this.delete(name);
                                }
                            }
                        }
                    }
                }
            },
            saveCreds: async () => { await this.write('creds', creds); },
            clear: async () => { await this.purgeKeys(); },
            removeCreds: async () => { await this.purgeAll(); },
            query: async (table, id) => {
                return await this.selectItemById(table, id);
            }
        };
    }
}
