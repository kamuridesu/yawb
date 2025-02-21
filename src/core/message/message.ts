import { WAMessage } from "@whiskeysockets/baileys";
import { Bot } from "../bot.js";
import { parseMessage } from "./parsers.js";
import { commandHandleProvisory } from "../../commands/commands.js";
import { ParsedMessage } from "./types.js";
import { Chat } from "src/db/types.js";

export class Message {
    bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
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
        const message = await parseMessage(rawMessage, this.bot);
        const user = await this.bot.database.member?.getChatMember(message?.author?.chatJid!, message?.author?.jid!);
        if (user?.silenced == 1) {
            await message?.delete();
            return;
        }
        if (!message) return
        const chatInfo = await this.bot.database.chat?.getChat(message!.author!.chatJid!);
        if (message!.body!.startsWith(chatInfo!.prefix)) {
            return await this.handleCommand(message, chatInfo!);
        }
        if (!((chatInfo?.isBotEnabled ?? 0) == 1)) {
            return;
        }
        return await this.handleChat(message);
    }

    private async handleCommand(message: ParsedMessage, chatInfo: Chat) {
        const body = message!.body!.substring(1);
        const raw = body.split(" ");
        const command = raw[0].toLocaleLowerCase();
        const args = raw.slice(1);
        if (!((chatInfo?.isBotEnabled ?? 0) == 1)) {
            if (!["start"].includes(command)) {
                return;
            }
        }
        await commandHandleProvisory(command, message, args, this.bot);
    }

    private async handleChat(message: ParsedMessage) {
        const member = await this.bot.database.member?.getChatMember(message!.author!.chatJid!, message!.author!.jid!);
        if (member == undefined) {
            throw new Error("Database not ready");
        }
        member.messages += 1;
        await this.bot.database.member?.updateChatMember(member);
    }

    private async handleChatMemberEnter() {

    }

    private async handleChatMemberLeave() {

    }

}
