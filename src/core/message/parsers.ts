import { WAMessage } from "@whiskeysockets/baileys";
import { Bot } from "../bot.js";
import { AuthorBuilder, Group, messageTypes, ParsedMessageBuilder, QuotedMessage } from "./types.js";

export async function parseMessage(message: WAMessage, bot: Bot) {
    if (message.message === undefined || message.message == null) {
        return;
    }
    const key = message.message;

    const originJid = message.key.remoteJid ?? "";

    const authorBuilder = new AuthorBuilder()
        .setJid(originJid)
        .setName(message.pushName ?? "")
        .setChatJid(originJid)
        .setIsBotOwner(false);

    const parsedMessageBuilder = new ParsedMessageBuilder()
        .setId(message.key.id)
        .setBot(bot)
        .setRaw(message);

    const parseBody = {
        "conversation": () => {
            parsedMessageBuilder.setBody(message.message?.conversation ?? "");
        },
        "imageMessage": () => {
            parsedMessageBuilder.setBody(message.message?.imageMessage?.caption ?? "")
            .setMediaType("image");
        },
        "videoMessage": () => {
            parsedMessageBuilder.setBody(message.message?.videoMessage?.caption ?? "")
            .setMediaType("video");
        },
        "extendedTextMessage": () => {
            parsedMessageBuilder.setBody(message.message?.extendedTextMessage?.text ?? "");
            const type = messageTypes.find(type => JSON.stringify(message.message).includes(type));
            if (!type) return;
            parsedMessageBuilder.setMentions(message.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? []);
            const unparsedQuotedMessage = message.message?.extendedTextMessage?.contextInfo;
            if (!unparsedQuotedMessage || !unparsedQuotedMessage.participant) {
                return;
            }
            const quotedMessage: QuotedMessage = {
                type: messageTypes.find(type => JSON.stringify(message.message).includes(type)) ?? "",
                author: new AuthorBuilder().setJid(unparsedQuotedMessage.participant)
                    .setName("unknown")
                    .setChatJid(originJid)
                    .setIsBotOwner(false)
                    .build(),
                body: unparsedQuotedMessage.quotedMessage !== undefined ? unparsedQuotedMessage.quotedMessage?.conversation
                    ?? (unparsedQuotedMessage.quotedMessage?.imageMessage?.caption
                        ?? (unparsedQuotedMessage.quotedMessage?.videoMessage?.caption ?? "")) : "",
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
        return parsedMessageBuilder.setAuthor(authorBuilder.build()).build();
    }

    const group = new Group(bot, originJid);
    authorBuilder.setJid(message.key.participant ?? "")
        .setGroup(group);
    const author = authorBuilder.build();
    parsedMessageBuilder
        .setAuthor(author)
        .setGroup(group);

    return parsedMessageBuilder.build();
}
