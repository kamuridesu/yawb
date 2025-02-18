import * as sqlite3 from "sqlite";
import pkg from 'sqlite3';
import { ChatDatabase, DatabaseConnectionPool, FilterDatabase, MemberDatabase } from "./db.js";
import { Chat, Filter, Member } from "./types.js";
const { Database: Sqlite3Driver } = pkg;

export class SQLitePool extends DatabaseConnectionPool {
    filename: string;

    constructor(filename: string) {
        super();
        this.filename = filename;
    }

    async init() {
        this.db = await sqlite3.open({
            filename: this.filename,
            driver: Sqlite3Driver
        });
    }
}

export class SQLiteChatDB extends ChatDatabase {

    async deleteChat(jid: string): Promise<void> {
        await this.cp?.db?.run(`DELETE FROM chat WHERE chatId = ?`, [jid]);
    }

    async getChat(jid: string): Promise<Chat> {
        const result = await this.cp?.db?.get(`SELECT * FROM chat WHERE chatId = ?`, [jid]);
        if (!result) {
            this.newChat(jid);
            return { chatId: jid, isBotEnabled: true, prefix: "!" };
        };
        return result as Chat;
    }

    async newChat(jid: string): Promise<void> {
        await this.cp?.db?.run(`INSERT INTO chat (chatId) VALUES (?)`, [jid]);
    }

    async botSwitch(jid: string): Promise<void> {
        let chatInfo = await this.getChat(jid);
        if (!chatInfo) {
            this.newChat(jid);
            chatInfo = { chatId: jid, isBotEnabled: false, prefix: "!" }
        }
        await this.cp?.db?.run(`UPDATE chat SET isBotEnabled = ? WHERE chatId = ?`,
            [chatInfo.isBotEnabled ? 1 : 0, jid]
        );
    }

    async changePrefix(jid: string, newPrefix: string): Promise<void> {
        await this.cp?.db?.run(`UPDATE chat SET prefix = ? WHERE chatId = ?`, [newPrefix, jid])
    }

}

export class SQLiteMemberDB extends MemberDatabase {
    async addMemberToChat(chatJid: string, id: string): Promise<void> {
        await this.cp?.db?.run(`INSERT INTO member (id, chatId) VALUES (?, ?)`,
            [id, chatJid]
        );
    }

    async deleteMemberFromChat(chatJid: string, id: string): Promise<void> {
        await this.cp?.db?.run(`DELETE FROM member WHERE chatId = ? AND id = ?`, [chatJid, id]);
    }

    async getAllChatMembers(chatJid: string): Promise<Member[]> {
        const resultSet = await this.cp?.db?.all(`SELECT * FROM member WHERE chatId = ?`, [chatJid]);
        if (resultSet === undefined) return [];
        return resultSet as Member[];
    }

    async getChatMember(chatJid: string, id: string): Promise<Member> {
        let result = await this.cp?.db?.get(`SELECT * FROM member WHERE chatId = ? AND id = ?`, [
            chatJid,
            id
        ]);
        if (result === undefined) {
            this.addMemberToChat(chatJid, id);
            return { chatId: chatJid, id: id, messages: 0, points: 0, warns: 0 };
        };
        return result as Member;
    }

    async updateChatMember(member: Member): Promise<void> {
        await this.cp?.db?.run(`UPDATE member SET warns = ?, points = ?, messages = ?`, [
            member.warns,
            member.points,
            member.messages
        ]);
    }
}

export class SQLiteFilter extends FilterDatabase {
    async deleteFilter(chatJid: string, pattern: string): Promise<void> {
        await this.cp?.db?.run(`DELETE FROM filter WHERE chatId = ? AND pattern = ?`, [chatJid, pattern]);
    }

    async getFilters(chatJid: string): Promise<Filter[]> {
        const resultSet = await this.cp?.db?.all(`SELECT * FROM filter WHERE chatId = ?`, [chatJid]);
        if (resultSet === undefined) return [];
        return resultSet as Filter[];
    }

    async newFilter(filter: Filter): Promise<void> {
        await this.cp?.db?.run(`INSERT INTO filter (chatId, pattern, kind, response) VALUES (?, ?, ?, ?)`, [
            filter.chatId,
            filter.pattern,
            filter.kind,
            filter.response
        ]);
    }
}
