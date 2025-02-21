import * as sqlite3 from "sqlite";
import { Chat, Filter, Member } from "./types.js";

export abstract class DatabaseConnectionPool {
    protected _db?: sqlite3.Database;

    set db(database: sqlite3.Database) {
        this._db = database;
    }

    get db(): sqlite3.Database | undefined {
        this.databaseIsNull();
        return this._db;
    }

    protected databaseIsNull() {
        if (this._db == undefined) {
            throw new Error("Database is not instantiated");
        }
    }

    abstract init(): Promise<void>;
}

abstract class Database {

    protected cp?: DatabaseConnectionPool;

    constructor(cp: DatabaseConnectionPool) {
        this.cp = cp;
    }
}

export abstract class ChatDatabase extends Database {
    abstract newChat(jid: string): Promise<void>;
    abstract getChat(jid: string): Promise<Chat>;
    abstract deleteChat(jid: string): Promise<void>;
    abstract updateChat(chat: Chat): Promise<void>;
}

export abstract class MemberDatabase extends Database {
    abstract addMemberToChat(chatJid: string, id: string): Promise<void>;
    abstract getChatMember(chatJid: string, id: string): Promise<Member>;
    abstract getAllChatMembers(chatJid: string): Promise<Member[]>;
    abstract deleteMemberFromChat(chatJid: string, id: string): Promise<void>;
    abstract updateChatMember(member: Member): Promise<void>;
}

export abstract class FilterDatabase extends Database {
    abstract newFilter(filter: Filter): Promise<void>;
    abstract getFilters(chatJid: string): Promise<Filter[]>;
    abstract deleteFilter(chatJid: string, pattern: string): Promise<void>;
}
