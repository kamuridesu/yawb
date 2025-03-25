import { Boom } from '@hapi/boom';
import Pino from 'pino';

import { makeWASocket, DisconnectReason,  ParticipantAction, proto, useMultiFileAuthState, makeCacheableSignalKeyStore, downloadMediaMessage } from "@whiskeysockets/baileys";
import { BotConfig } from "../configs/botConfig.js";
import { parseMessage } from './message/parsers.js';
import { State } from 'src/core/state/state.js';
import { DatabaseFactory } from 'src/configs/db/factory.js';
import { Message } from './message/message.js';
import { normalizeTextMentions } from '../helpers/text.js';
import { Media, ParsedMessage } from './message/types.js';

const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

const logger = Pino().child({
    level: 'debug',
    stream: 'store',
});

export class Bot {
    public name: string;
    public ownerId: string;
    public botNumber?: string;
    public database: DatabaseFactory;

    private sock?: ReturnType<typeof makeWASocket>;
    private stateDB: State;
    private handlers = new Message(this);

    constructor(config: BotConfig) {
        this.name = config.name;
        this.ownerId = config.ownerNumber;
        this.stateDB = config.stateStorage;
        this.database = config.database;
    }

    async init() {
        // const { state, saveCreds } = await this.stateDB.asState();

        this.sock = makeWASocket({
            printQRInTerminal: true,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger as any)
            },
            syncFullHistory: false,
            shouldSyncHistoryMessage: () => false,
            logger: logger as any,
            version: [2, 3000, 1015901307]
        });

        this.sock.ev.on("creds.update", saveCreds);

        this.sock.ev.on('connection.update', (update) => {
            this.botNumber = state?.creds.me?.id.replace(/:\d+/, "");
            const { connection, lastDisconnect } = update
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
                console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
                if (shouldReconnect) {
                    this.init();
                }
            } else if (connection === 'open') {
                console.log('opened connection')
            }
        });

        this.sock.ev.on('messages.upsert', async (handle: { messages: any; type: string; }) => {
            for (let message of handle.messages) {
                if (!message.key.fromMe && handle.type === "notify") {
                    await this.handlers.handle(message);
                }
            }
        });
    }

    async fetchGroupInfo(jid: string) {
        return await this.sock?.groupMetadata(jid);
    }

    async fetchAllGroups() {
        const groups = await this.sock?.groupFetchAllParticipating();
        if (groups) {
            return Object.entries(groups).slice(0).map(entry => entry[1]);
        }
    }

    async updateGroupParticipants(chatJid: string, users: string[], action: ParticipantAction) {
        await this.sock?.groupParticipantsUpdate(chatJid, users, action);
    }

    async deleteMessage(jid: string, key: proto.IMessageKey) {
        await this.sock?.sendMessage(jid, {delete: key});
    }

    async sendTextMessage(jid: string, msg: string | Media, options?: any): Promise<ParsedMessage | undefined> {
        let sentMessage: ParsedMessage | undefined;
        let message: { ["text"]: string, ["mentions"]: string[], ["edit"]?: any } | Media | undefined;
        try {
            if (typeof msg == "string") {
                const parsedText = normalizeTextMentions(msg);
                if (options !== undefined && options.mentions) {
                    parsedText.mentions = parsedText.mentions.concat(options.mentions);
                }
                message = {
                    text: parsedText.text,
                    mentions: parsedText.mentions
                }
                if (options?.edit !== undefined) {
                    message.edit = options.edit;
                    delete options.edit;
                }
            } else {
                message = msg;
            }
            
            await this.sock?.presenceSubscribe(jid);
            await this.sock?.sendPresenceUpdate("composing", jid);
            const response = await this.sock?.sendMessage(jid, message!, options);
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
            await this.sock?.sendMessage(message!.author!.chatJid!, { react: { text: emoji, key: message!.raw!.key } });
        } catch (e) {
            console.error(e);
        } finally {
            return sentMessage;
        }
    }

    async downloadMedia(message: proto.WebMessageInfo): Promise<Buffer<ArrayBufferLike>> {
        return await downloadMediaMessage(message, "buffer", {});
    }

}
