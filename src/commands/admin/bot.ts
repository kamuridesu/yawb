import { Emojis } from "../../common/emojis.js";
import { Bot } from "../../core/bot.js";
import { ParsedMessage } from "../../core/message/types.js";
import { sendReactionMessage } from "../helpers.js";
import { isGroupAndMemberIsAdmin } from "./guards.js";

export async function stopBot(message: ParsedMessage, _: string[], bot: Bot) {
    if (!(await isGroupAndMemberIsAdmin(message))) return;
    const chatInfo = await bot.database.chat?.getChat(message.author!.chatJid!);
    if (chatInfo) {
        if (chatInfo.isBotEnabled == 1) {
            chatInfo.isBotEnabled = 0;
            await bot.database.chat?.updateChat(chatInfo);
            await sendReactionMessage(message, Emojis.success, `Bot desativado. Para ativar use ${chatInfo.prefix}start`);
        }
    }
}

export async function startBot(message: ParsedMessage, _: string[], bot: Bot) {
    if (!(await isGroupAndMemberIsAdmin(message))) return;
    const chatInfo = await bot.database.chat?.getChat(message.author!.chatJid!);
    if (chatInfo) {
        if (chatInfo.isBotEnabled == 0) {
            chatInfo.isBotEnabled = 1;
            await bot.database.chat?.updateChat(chatInfo);
            await sendReactionMessage(message, Emojis.success, `Bot ativo. Para desativar use ${chatInfo.prefix}stop`);
        }
    }
}

export async function broadcastToGroups(message: ParsedMessage, args: string[], bot: Bot) {
    if (!message.author?.isBotOwner) {
        return await sendReactionMessage(message, Emojis.fail, "Este comando pode ser usado apenas pelo dono do bot.");
    }
    if (args.length < 1) return await sendReactionMessage(message, Emojis.fail, "Faltando texto para enviar.");
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
        return await sendReactionMessage(message, Emojis.success, "Transmissão enviada com sucesso");
    }
    return await sendReactionMessage(message, Emojis.fail, "Não foi possível listar os grupos");
}
