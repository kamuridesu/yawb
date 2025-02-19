import { WAMessage } from "@whiskeysockets/baileys";
import { Bot } from "./bot.js";
import { ParsedMessage, parseMessage } from "./parsers.js";

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
        if (!message) return
        const chatInfo = await this.bot.database.chat?.getChat(message!.author!.chatJid);
        if (!chatInfo?.isBotEnabled) {
            return;
        }
        console.log(message!.author!.name);
        console.log(chatInfo);
        if (message!.body!.startsWith(chatInfo.prefix)) {
            return await this.handleCommand(message);
        }
        return await this.handleChat(message);
    }

    private async handleCommand(message: ParsedMessage) {
        const body = message!.body!.substring(1);
        const raw = body.split(" ");
        const command = raw[0].toLocaleLowerCase();
        const args = raw.slice(1);

        if (command == "start") {
            await message.reply("Hello World");
        }
    }

    private async handleChat(message: ParsedMessage) {
        const member = await this.bot.database.member?.getChatMember(message!.author!.chatJid, message!.author!.jid);
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