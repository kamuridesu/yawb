import { WAMessage } from "@whiskeysockets/baileys";
import { Bot } from "./bot.js";

export class Message {
    bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    async parse(message: WAMessage) {

    }

    async handle(rawMessage: WAMessage) {
        if ((!rawMessage.message)
            || (rawMessage.key && rawMessage.key.remoteJid === "status@broadcast")
            || (rawMessage.key && rawMessage.key.id?.startsWith("BAE5") && rawMessage.key.id.length == 16)
            || (rawMessage.key.fromMe)) {
            return false;
        }
        rawMessage.message =
            Object.keys(rawMessage.message)[0] === "ephemeralMessage"
                ? rawMessage.message?.ephemeralMessage?.message
                : rawMessage.message;
        const message = this.parse(rawMessage);
        if (!message) return;
    }

    private async handleCommand() {

    }

    private async handleChat() {

    }

    private async handleChatMemberEnter() {

    }

    private async handleChatMemberLeave() {

    }

}