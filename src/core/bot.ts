import { Boom } from '@hapi/boom';
import P from 'pino';

import { makeWASocket, DisconnectReason, GroupMetadata } from "@whiskeysockets/baileys";
import NodeCache from "node-cache";
import { BotConfig } from "../configs/botConfig.js";
import { Audio, Media, ParsedMessage, parseMessage } from './parsers.js';
import { State } from 'src/core/storage/state.js';
import { DatabaseFactory } from 'src/db/factory.js';
import { Message } from './message.js';
import { normalizeTextMentions } from '../helpers/text.js';

export class Bot {
    public name: string;
    public ownerId: string;
    public botNumber?: string;
    public database: DatabaseFactory;

    private sock?: ReturnType<typeof makeWASocket>;
    private stateDB: State;
    private handlers = new Message(this);
    private groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

    constructor(config: BotConfig) {
        this.name = config.name;
        this.ownerId = config.ownerNumber;
        this.stateDB = config.stateStorage;
        this.database = config.database;
    }

    async init() {
        const { state, saveCreds } = await this.stateDB.asState();

        this.sock = makeWASocket({
            printQRInTerminal: true,
            cachedGroupMetadata: async (jid) => this.groupCache.get(jid),
            auth: {
                creds: state.creds,
                keys: state.keys
            }
        });

        this.sock.ev.on("connection.update", saveCreds);

        this.sock.ev.on("groups.update", async ([ev]) => {
            if (ev?.id == undefined) {
                return;
            }
            const metadata = await this.sock?.groupMetadata(ev.id);
            this.groupCache.set(ev.id, metadata);
        });

        this.sock.ev.on('group-participants.update', async (ev) => {
            const metadata = await this.sock?.groupMetadata(ev.id);
            this.groupCache.set(ev.id, metadata);
        });

        this.sock.ev.on('connection.update', (update) => {
            this.botNumber = state.creds.me?.id.replace(/:\d+/, "");
            const { connection, lastDisconnect } = update
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
                console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
                if (shouldReconnect) {
                    return this.init();
                }
            } else if (connection === 'open') {
                console.log('opened connection')
            }
        });

        this.sock.ev.on("messages.upsert", async (handle: { messages: any, type: string }) => {
            console.log("======= received msg========")
            for (const message of handle.messages) {
                await this.handlers.handle(message);
            }
        });
    }

    async fetchGroupInfo(jid: string) {
        let metadata: GroupMetadata | undefined = this.groupCache.get(jid) as GroupMetadata;
        if (metadata === undefined) {
            metadata = await this.sock?.groupMetadata(jid);
            this.groupCache.set(jid, metadata);
        }
        return metadata;
    }

    async sendTextMessage(jid: string, text: string | Media, options?: any): Promise<ParsedMessage | undefined> {
        let sentMessage: ParsedMessage | undefined;
        try {
            const parsedText = normalizeTextMentions();
            if (options !== undefined && options.mentions) {
                parsedText.mentions = parsedText.mentions.concat(options.mentions);
            }
            const message: { ["text"]: string, ["mentions"]: string[], ["edit"]?: any } = {
                text: parsedText.text,
                mentions: parsedText.mentions
            }
            if (options?.edit !== undefined) {
                message.edit = options.edit;
                delete options.edit;
            }
            await this.sock?.presenceSubscribe(jid);
            await this.sock?.sendPresenceUpdate("composing", jid);
            const response = await this.sock?.sendMessage(jid, message, options);
            if (response) {
                sentMessage = await parseMessage(response, this);
            }
            await this.sock?.sendPresenceUpdate("paused", jid);
        } catch (e) {
            console.error(e);
        } finally {
            return sentMessage;
        }
    }

    async reactToMessage(message: ParsedMessage, emoji: string): Promise<ParsedMessage | undefined> {
        let sentMessage: ParsedMessage | undefined;
        try {
            await this.sock?.sendMessage(message!.author!.chatJid, { react: { text: emoji, key: message!.raw!.key } });
        } catch (e) {
            console.error(e);
        } finally {
            return sentMessage;
        }
    }

}
