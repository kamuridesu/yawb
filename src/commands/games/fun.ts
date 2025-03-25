import { Emojis } from "../../common/emojis.js";
import { Bot } from "../../core/bot.js";
import { ParsedMessage } from "../../core/message/types.js";

export async function chanceDe(message: ParsedMessage, args: string[], bot: Bot) {
    if (args.length < 1) {
        const chat = await bot.database.chat?.getChat(message.author?.chatJid!);
        return await message.reply(
            `Preciso de uma mensagem para saber a chance. Exemplo: ${chat?.prefix}chance de eu ficar off`,
            Emojis.fail,
        );
    }
    return await message.reply(
        `A chance de ${args.join(" ")} é de ${Math.round(Math.random() * 100)}%`,
        Emojis.success,
    );
}

export async function percentage(message: ParsedMessage, args: string[], _: Bot) {
    if (args.length < 1) {
        return await message.reply("Preciso de algo para saber a porcentagem.", Emojis.fail);
    }
}
