import { File } from "../../configs/storage/storage.js";
import { Emojis } from "../../common/emojis.js";
import { Bot } from "../../core/bot.js";
import { ParsedMessage } from "../../core/message/types.js";

export async function newFilter(message: ParsedMessage, args: string[], bot: Bot) {
    if (args.length < 1 || !message.quotedMessage) {
        await message.reply("Preciso de uma mensagem para registrar", Emojis.fail);
    }

    if (!["conversation",
        "imageMessage",
        "videoMessage",
        "stickerMessage",
        "extendedTextMessage"].includes(message.quotedMessage?.type!)) {
        return await message.reply("Tipo de mensagem não suportado!", Emojis.fail);
    }

    const pattern = args.join(" ");

    if ((await bot.database.filter?.getFilters(message.author?.chatJid!) ?? [])
        .filter(x => x.pattern == pattern).length > 0) {
        return await message.reply(`Filtro '${pattern}' já existe!`, Emojis.fail);
    }

    const filter = {
        chatId: message.author?.chatJid!,
        kind: message.quotedMessage!.type!,
        pattern: pattern,
        response: ""
    }

    const randomFilename = `filter_media/${Math.random() * 1000}`;

    if (["conversation", "extendedTextMessage"].includes(message.quotedMessage?.type!)) {
        filter.response = message.quotedMessage!.body! as string;
    } else if (["imageMessage", "stickerMessage", "videoMessage"].includes(message.quotedMessage!.type!)) {
        const isVideo = message.quotedMessage?.type! == "videoMessage";
        if (isVideo && message.raw?.message?.videoMessage?.seconds! > 11) {
            return await message.reply("Os vídeos são limitados a 11 segundos.", Emojis.fail);
        }
        const bytes = await message.downloadMedia();
        if (!bytes) {
            return await message.reply("Não consegui baixar a mídia :(", Emojis.fail);
        }

        const path = await new File(randomFilename + (isVideo ? ".mp4" : ".jpg")).write(bytes);
        filter.response = path;
    } else {
        return await message.reply("Tipo de mensagem não reconhecido!", Emojis.fail);
    }
    await bot.database.filter?.newFilter(filter);
    return message.react(Emojis.success);
}

export async function listFilter(message: ParsedMessage, _: string[], bot: Bot) {
    const filters = (await bot.database.filter?.getFilters(message.author?.chatJid!)) ?? [];

    const chatFiltersPatterns = filters.map(filter => {
        return filter.pattern;
    }).join("\n- ");

    return await message.reply("Filtros no chat: \n- " + chatFiltersPatterns, Emojis.success);
}

export async function removeFilter(message: ParsedMessage, args: string[], bot: Bot) {
    if (args.length < 1 || args.join(" ") == "") {
        return await message.reply("Preciso do padrão para remover o filtro.", Emojis.fail);
    }

    await bot.database.filter?.deleteFilter(message.author?.chatJid!, args.join(" "));

    return await message.react(Emojis.success);
}
