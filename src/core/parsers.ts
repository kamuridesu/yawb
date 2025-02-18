import { GroupParticipant, WAMessage } from "@whiskeysockets/baileys";
import { Bot } from "./bot.js";

const messageTypes = [
    "audioMessage",
    "videoMessage",
    "conversation",
    "imageMessage",
    "stickerMessage",
    "extendedTextMessage",
    "reactionMessage"
];

type Author = {
    jid: string;
    name: string;
    chatJid: string;
    isAdmin: boolean;
    isBotOwner: boolean;
    isGroupOwner: boolean;
}

type Group = {
    name: string;
    description?: string;
    groupId: string;
    members: GroupParticipant[];
    admins: GroupParticipant[];
    locked: boolean;
    botIsAdmin?: boolean;
}

type QuotedMessage = {
    type: string;
    stanzaId: string;
    author: Author;
    body: string;
    raw: string;
}

export class ParsedMessage {
    id?: string | null;
    body?: string;
    author?: Author;
    group?: Group;
    mentions?: string[];
    quotedMessage?: QuotedMessage;
    raw?: WAMessage;
    bot?: Bot;

    async reply(text: string) {
        await this.bot?.sendTextMessage(this.author!.chatJid, text, {quoted: this.raw});
    }

    async react(emoji: string) {

    }
}

class ParsedMessageBuilder {

    private parsedMessage = new ParsedMessage();

    constructor() { }

    setId(id: string | undefined | null) {
        this.parsedMessage.id = id;
        return this;
    }

    setBody(body: string) {
        this.parsedMessage.body = body;
        return this;
    }

    setAuthor(author: Author) {
        this.parsedMessage.author = author;
        return this;
    }

    setGroup(group: Group) {
        this.parsedMessage.group = group;
        return this;
    }

    setMentions(mentions: string[]) {
        this.parsedMessage.mentions = mentions;
        return this;
    }

    setQuotedMessage(quotedMessage: QuotedMessage) {
        this.parsedMessage.quotedMessage = quotedMessage;
        return this;
    }

    setRaw(raw: WAMessage) {
        this.parsedMessage.raw = raw;
        return this;
    }

    setBot(bot: Bot) {
        this.parsedMessage.bot = bot;
        return this;
    }

    build() {
        if (!this.parsedMessage.id) {
            console.log(this.parsedMessage.id);
            console.log(this.parsedMessage.raw);
            throw new Error("Error parsing message, missing required fields");
        }
        return this.parsedMessage;
    }
}


export async function parseMessage(message: WAMessage, bot: Bot) {
    if (message.message === undefined || message.message == null) {
        return;
    }
    const key = message.message;

    const originJid = message.key.remoteJid ?? "";

    const author: Author = {
        chatJid: originJid,
        name: message.pushName ?? "",
        isAdmin: false,
        isBotOwner: false,
        isGroupOwner: false,
        jid: originJid
    };

    const parsedMessageBuilder = new ParsedMessageBuilder();
    parsedMessageBuilder.setId(message.key.id)
        .setBot(bot)
        .setRaw(message);

    const parseBody = {
        "conversation": () => parsedMessageBuilder.setBody(message.message?.conversation ?? ""),
        "imageMessage": () => parsedMessageBuilder.setBody(message.message?.imageMessage?.caption ?? ""),
        "videoMessage": () => parsedMessageBuilder.setBody(message.message?.videoMessage?.caption ?? ""),
        "extendedTextMessage": () => {
            parsedMessageBuilder.setBody(message.message?.extendedTextMessage?.text ?? "");
            const type = messageTypes.find(type => JSON.stringify(message.message).includes(type));
            if (!type) return;
            parsedMessageBuilder.setMentions(message.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? []);
            const unparsedQuotedMessage = JSON.parse(JSON.stringify(message).replace('quotedM', 'm')).message.extendedTextMessage.contextInfo;
            if (!unparsedQuotedMessage || !unparsedQuotedMessage.participant) {
                return;
            }
            const quotedMessage: QuotedMessage = {
                type: messageTypes.find(type => JSON.stringify(message.message).includes(type)) ?? "",
                author: {
                    jid: unparsedQuotedMessage.participant,
                    name: "unknown",
                    chatJid: originJid,
                    isAdmin: false,
                    isBotOwner: false,
                    isGroupOwner: false
                },
                body: unparsedQuotedMessage.message !== undefined ? unparsedQuotedMessage.message.conversation
                    ?? (unparsedQuotedMessage.message.imageMessage
                        ?? (unparsedQuotedMessage.message.videoMessage ?? "")) : "",
                raw: unparsedQuotedMessage,
                stanzaId: unparsedQuotedMessage.stanzaId
            }
            parsedMessageBuilder.setQuotedMessage(quotedMessage);
        }
    }

    const type = messageTypes.find(type => Object.keys(key).includes(type)) as keyof typeof parseBody;
    if (!type || !messageTypes.includes(type)) return;
    const func = parseBody[type];
    if (func != undefined) {
        func()
    } else {
        parsedMessageBuilder.setBody("");
    }

    if (!originJid.includes("@g.us")) {
        return parsedMessageBuilder.setAuthor(author).build();
    }


    const groupData = await bot.fetchGroupInfo(originJid);

    const members = groupData?.participants ?? [];
    const admins = groupData?.participants.filter((m) => m.admin === "admin" || m.admin === "superadmin") ?? [];

    const group: Group = {
        name: groupData!.subject,
        admins: admins,
        members: members,
        groupId: originJid,
        botIsAdmin: admins.map(x => x.id).includes(bot.botNumber!),
        description: groupData?.desc,
        locked: false,
    };

    author.jid = message.key.participant ?? "";

    parsedMessageBuilder
        .setAuthor(author)
        .setGroup(group);

    return parsedMessageBuilder.build();
}
