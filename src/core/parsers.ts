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

type ParsedMessage = {
    id?: string | null;
    body: string;
    author: Author;
    group: Group | undefined;
    mentions: string[] | undefined;
    quotedMessage: QuotedMessage | undefined;
}

export async function parseMessage(message: WAMessage, bot: Bot) {
    if (message.message === undefined || message.message == null) {
        return;
    }
    const key = message.message;

    const originJid = message.key.remoteJid ?? "";

    const messageData: ParsedMessage = {
        id: message.key.id,
        author: {
            chatJid: originJid,
            name: message.pushName ?? "",
            isAdmin: false,
            isBotOwner: false,
            isGroupOwner: false,
            jid: originJid
        },
        body: "",
        group: undefined,
        mentions: [],
        quotedMessage: undefined
    };

    const parseBody = {
        "conversation": () => messageData.body = message.message?.conversation ?? "",
        "imageMessage": () => messageData.body = message.message?.imageMessage?.caption ?? "",
        "videoMessage": () => messageData.body = message.message?.videoMessage?.caption ?? "",
        "extendedTextMessage": () => {
            messageData.body = message.message?.extendedTextMessage?.text ?? "";
            const type = messageTypes.find(type => JSON.stringify(message.message).includes(type));
            if (!type) return;
            messageData.mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
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
            messageData.quotedMessage = quotedMessage;
        }
    }

    const type = messageTypes.find(type => Object.keys(key).includes(type)) as keyof typeof parseBody;
    if (!type || !messageTypes.includes(type)) return;
    const func = parseBody[type];
    if (func != undefined) {
        func()
    }

    if (!originJid.includes("@g.us")) {
        return messageData;
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

    messageData.author.jid = message.key.participant ?? "";

    messageData.group = group;

    console.log(messageData);

    return messageData;

}