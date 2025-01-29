import { Boom } from '@hapi/boom';
import P from 'pino';


import { makeWASocket, DisconnectReason } from "@whiskeysockets/baileys";
import NodeCache from "node-cache";
import { BotConfig } from "../configs/botConfig.js";
import { StateSQLiteDB } from "../storage/state.js";

export class Bot {
    public name: string;
    public ownerId: string;
    public botNumber?: string;

    private sock?: ReturnType<typeof makeWASocket>;
    private language: string;
    private groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false })

    constructor(config: BotConfig) {
        this.name = config.name;
        this.ownerId = config.ownerNumber;
        this.language = config.language ?? "enus"
    }

    async init() {
        const db = new StateSQLiteDB({ filename: "test.db" });
        await db.init();
        const { state, saveCreds } = await db.asState();

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
            this.botNumber = state.creds.me?.id.replace(/:\d/, "");
            const { connection, lastDisconnect } = update
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
                console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
                // reconnect if not logged out
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
                console.log(message);
                console.log(typeof message);
            }
        });
    }

}
