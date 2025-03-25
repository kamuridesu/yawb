import { WAMessage } from "@whiskeysockets/baileys";
import { Bot } from "../bot.js";
import { parseMessage } from "./parsers.js";
import { commandHandler } from "../../commands/commands.js";
import { ParsedMessage } from "./types.js";
import { Chat, Member } from "../../configs/db/types.js";

export class Message {
    bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    async handle(rawMessage: WAMessage) {
        console.log("handle");
        if ((!rawMessage.message)
            || (rawMessage.key && rawMessage.key.remoteJid === "status@broadcast")
            || (rawMessage.key && rawMessage.key.id?.startsWith("BAE5") && rawMessage.key.id.length == 16)
            || (rawMessage.key.fromMe)) {
            return;
        }
        rawMessage.message =
            Object.keys(rawMessage.message)[0] === "ephemeralMessage"
                ? rawMessage.message?.ephemeralMessage?.message
                : rawMessage.message;
        const message = await parseMessage(rawMessage, this.bot);
        console.log(message);
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
        return await this.handleChat(message, user);
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
        await commandHandler(command, message, args, this.bot);
    }

    private async handleChat(message: ParsedMessage, member: Member | undefined) {
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
