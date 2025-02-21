import { Emojis } from "../../common/emojis.js";
import { Bot } from "../../core/bot.js";
import { ParsedMessage } from "../../core/message/types.js";
import { sendReactionMessage } from "../helpers.js";
import { isGroupAndMemberIsAdmin } from "./guards.js";

export async function banUser(message: ParsedMessage, _: string[], bot: Bot) {
    if (!(await isGroupAndMemberIsAdmin(message))) return;
    if (!(await message.group?.isBotAdmin())) return await sendReactionMessage(message, Emojis.fail, `${bot.name} não é admin.`);
    if (message.mentions!.length < 1 && !message.quotedMessage) {
        return await sendReactionMessage(message, Emojis.fail, "Preciso que algum usuario seja mencionado.");
    }
    const users = [...message.mentions!, message.quotedMessage?.author.jid].filter(Boolean) as string[];
    await bot.updateGroupParticipants(message.author!.chatJid!, users, "remove");
}

async function warnManager(message: ParsedMessage, bot: Bot, removeWarn = false) {
    if (!(await isGroupAndMemberIsAdmin(message))) return;
    if (message.mentions!.length < 1 && !message.quotedMessage) {
        return await sendReactionMessage(message, Emojis.fail, "Preciso que algum usuario seja mencionado.");
    }
    const userIds = [...message.mentions!, message.quotedMessage?.author.jid].filter(Boolean) as string[];
    let textMessage = "";
    try {
        userIds.forEach(async id => {
            const user = await bot.database.member!.getChatMember(message.author!.chatJid!, id);
            if (removeWarn) {
                user.warns -= 1;
                await bot.database.member!.updateChatMember(user);
                textMessage += `Usuário ${id} teve um aviso removido. Total de avisos: ${user.warns}\n`;
                return;
            }
            user.warns += 1;
            if (user.warns > 3) {
                try {
                    await bot.updateGroupParticipants(message.author!.chatJid!, [id], "remove");
                    user.warns = 0;
                    await bot.database.member!.updateChatMember(user);
                    textMessage += `Usuario ${id} foi banido por excesso de avisos\n`;
                } catch (e) {
                    textMessage += "Erro ao tentar remover usuário " + id + "\n";
                }
                return;
            }
            await bot.database.member!.updateChatMember(user);
            textMessage += `Usuário ${id} recebeu um aviso. Total de avisos: ${user.warns}, mais ${4 - user.warns} e será banido.\n`;
        });
        await sendReactionMessage(message, Emojis.success, textMessage);
    } catch (e) {
        await sendReactionMessage(message, Emojis.fail, "Um erro ocorreu, reporte com /bug: \n\n" + e);
    }
};

async function listWarns(message: ParsedMessage, bot: Bot) {
    const chatUsers = await bot.database.member?.getAllChatMembers(message.author!.chatJid!) ?? [];
    const usersWithWarns = chatUsers.filter(u => u.warns > 0);
    const msg = usersWithWarns.length == 0 ? "Nenhum usuário com warns encontrado."
        : "Usuários com warns: \n- " + usersWithWarns.join("\n- ");
    await sendReactionMessage(message, Emojis.success, msg);
}

export async function warn(message: ParsedMessage, args: string[], bot: Bot) {
    if (args.includes("remover")) {
        return await warnManager(message, bot, true);
    }
    if (args.includes("listar")) {
        return await listWarns(message, bot);
    }
    return await warnManager(message, bot)
}

