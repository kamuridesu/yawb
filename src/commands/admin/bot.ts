import { Emojis } from "../../common/emojis.js";
import { Bot } from "../../core/bot.js";
import { ParsedMessage } from "../../core/message/types.js";
import { isGroupAndAdmin } from "./guards.js";

export async function stopBot(message: ParsedMessage, _: string[], bot: Bot) {
    if (!(await isGroupAndAdmin(message))) return;
    const chatInfo = await bot.database.chat?.getChat(message.author!.chatJid!);
    if (chatInfo) {
        if (chatInfo.isBotEnabled == 1) {
            chatInfo.isBotEnabled = 0;
            await bot.database.chat?.updateChat(chatInfo);
            await message.reply(`Bot desativado. Para ativar use ${chatInfo.prefix}start`, Emojis.success);
        }
    }
}

export async function startBot(message: ParsedMessage, _: string[], bot: Bot) {
    if (!(await isGroupAndAdmin(message))) return;
    const chatInfo = await bot.database.chat?.getChat(message.author!.chatJid!);
    if (chatInfo) {
        if (chatInfo.isBotEnabled == 0) {
            chatInfo.isBotEnabled = 1;
            await bot.database.chat?.updateChat(chatInfo);
            await message.reply(`Bot ativo. Para desativar use ${chatInfo.prefix}stop`, Emojis.success);
        }
    }
}

export async function broadcastToGroups(message: ParsedMessage, args: string[], bot: Bot) {
    if (!message.author?.isBotOwner) {
        return await message.reply("Este comando pode ser usado apenas pelo dono do bot.", Emojis.fail);
    }
    if (args.length < 1) return await message.reply("Faltando texto para enviar.", Emojis.fail);
    const groups = await bot.fetchAllGroups();
    if (groups) {
        const promises: Promise<void>[] = [];
        groups.forEach(async g => {
            promises.push((async () => {
                await new Promise(resolve => setTimeout(resolve, Math.round(Math.random() * (2000 - 1000 + 1)) + 1000));
                await bot.sendTextMessage(g.id, args.join(" "));
            })());
        });
        await Promise.all(promises);
        return await message.reply("Transmissão enviada com sucesso", Emojis.success);
    }
    return await message.reply("Não foi possível listar os grupos", Emojis.fail);
}
