import { makeWASocket, DisconnectReason } from "@whiskeysockets/baileys";
import NodeCache from "node-cache";
import { StateSQLiteDB } from "../storage/state.js";
export class Bot {
    constructor(config) {
        var _a;
        this.groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });
        this.name = config.name;
        this.ownerId = config.ownerNumber;
        this.language = (_a = config.language) !== null && _a !== void 0 ? _a : "enus";
    }
    async init() {
        const db = new StateSQLiteDB({ filename: "test.db" });
        await db.init();
        const { state, saveCreds, clear, removeCreds, query } = await db.asState();
        this.sock = makeWASocket({
            printQRInTerminal: true,
            auth: {
                creds: state.creds,
                keys: state.keys
            }
        });
        this.sock.ev.on("connection.update", saveCreds);
        this.sock.ev.on('connection.update', (update) => {
            var _a, _b, _c;
            this.botNumber = (_a = state.creds.me) === null || _a === void 0 ? void 0 : _a.id.replace(/:\d/, "");
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const shouldReconnect = ((_c = (_b = lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error) === null || _b === void 0 ? void 0 : _b.output) === null || _c === void 0 ? void 0 : _c.statusCode) !== DisconnectReason.loggedOut;
                console.log('connection closed due to ', lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error, ', reconnecting ', shouldReconnect);
                // reconnect if not logged out
                if (shouldReconnect) {
                    this.init();
                }
            }
            else if (connection === 'open') {
                console.log('opened connection');
            }
        });
        this.sock.ev.on("messages.upsert", async (handle) => {
            for (const message of handle.messages) {
                console.log(message);
                console.log(typeof message);
            }
        });
    }
}
