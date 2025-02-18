import { State } from "./state.js";

import { BufferJSON, initAuthCreds } from "@whiskeysockets/baileys";

import * as sqlite3 from "sqlite";
import pkg from 'sqlite3';
const { Database: Sqlite3Driver } = pkg;
import { SelectResultType } from "./types.js";


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
