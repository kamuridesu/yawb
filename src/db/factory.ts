import { ChatDatabase, DatabaseConnectionPool, FilterDatabase, MemberDatabase } from "./db.js";
import { SQLiteChatDB, SQLiteFilter, SQLiteMemberDB, SQLitePool } from "./sqlite.js";

export enum DBType {
    SQLITE,
    POSTGRES
}

export class DatabaseFactory {

    protected dbType: DBType;
    protected cp?: DatabaseConnectionPool;
    chat?: ChatDatabase;
    member?: MemberDatabase;
    filter?: FilterDatabase;

    constructor(db: DBType, connection: string) {
        this.dbType = db;
        switch (db) {
            case DBType.SQLITE:
                this.cp = new SQLitePool(connection);
                break;
            case DBType.POSTGRES:
                break;
            default:
                throw new Error("Database not recognized");
        }
    }

    async init() {
        if (this.cp === undefined) {
            throw new Error("Could not instantiate database");
        }
        await this.cp.init();
        switch (this.dbType) {
            case DBType.SQLITE:
                this.chat = new SQLiteChatDB(this.cp);
                this.filter = new SQLiteFilter(this.cp);
                this.member = new SQLiteMemberDB(this.cp);
                break;
            case DBType.POSTGRES:
                break;
            default:
                throw new Error("Database not recognized");
        }
    }

}