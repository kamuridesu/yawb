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
    if ((message.mentions ?? []).length < 1 && !message.quotedMessage) {
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
    const msg = usersWithWarns.length == 0 ? "Nenhum usuário com avisos encontrado."
        : "Usuários com avisos: \n- " + usersWithWarns.map(u => u.id).join("\n- ");
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

export async function mentionUsers(message: ParsedMessage, args: string[], _: Bot) {
    if (!(await isGroupAndMemberIsAdmin(message))) return;
    if (args.length <= 0 && message.quotedMessage == undefined) {
        return await sendReactionMessage(message, Emojis.fail, "Nenhuma mensagem enviada.");
    }
    const memberIds = (await message.group?.getMembers())?.map(member => member.id) ?? [];

    let text = args.join(" ");

    if (message.quotedMessage) {
        text = message.quotedMessage.body;
    }

    await message.reply(text, { mentions: memberIds });
    await message.react(Emojis.success);
}

export async function updateUserRole(message: ParsedMessage, bot: Bot, action: "promote" | "demote") {
    if (!(await isGroupAndMemberIsAdmin(message))) return;
    if (!(await message.group?.isBotAdmin())) {
        return await sendReactionMessage(message, Emojis.fail, `${bot.name} não é admin`);
    }

    if ((message.mentions?.length ?? 0 < 1) && !message.quotedMessage) {
        return await sendReactionMessage(message, Emojis.fail, "Nenhum usuário mencionado.");
    }

    const textMsg = (await Promise.all([...message.mentions!, message.quotedMessage?.author.jid]
        .filter(Boolean)
        .map(async u => {
            const isAdmin = (await message.group?.getAdmins())?.some(x => x.id == u);
            if ((isAdmin && action == "promote") || (!isAdmin && action == "demote")) {
                return `Usuário ${u} ${action === 'promote' ? 'é' : 'não é'} admin.`;
            }
            await bot.updateGroupParticipants(message.author!.chatJid!, [u!], action);
            return "";
        })))
        .join("\n");
    await sendReactionMessage(message, Emojis.success, textMsg);
}

export async function promote(message: ParsedMessage, _: string[], bot: Bot) {
    return await updateUserRole(message, bot, "promote");
}

export async function demote(message: ParsedMessage, _: string[], bot: Bot) {
    return await updateUserRole(message, bot, "demote");
}

export async function setPrefix(message: ParsedMessage, args: string[], bot: Bot) {
    if (!(await isGroupAndMemberIsAdmin(message))) return;

    const newPrefix = args.join(" ").trim();
    console.log(`Prefix: ${newPrefix}`);
    console.log(newPrefix.length);
    if (newPrefix.length > 1 || newPrefix.length <= 0) {
        return sendReactionMessage(message, Emojis.fail, "O prefixo precisa ter 1 caractere.");
    }
    const chat = await bot.database.chat!.getChat(message.author!.chatJid!);
    chat.prefix = newPrefix;
    await bot.database.chat?.updateChat(chat);
    await message.react(Emojis.success);
}

export async function pointsAddSub(message: ParsedMessage, args: string[], bot: Bot, action: "add" | "remove") {
    if (!(await isGroupAndMemberIsAdmin(message))) return;
    if (args.length < 1) {
        return await sendReactionMessage(message, Emojis.fail, "Faltando número de pontos.");
    }
    if ((message.mentions ?? []).length < 1 && message.quotedMessage === undefined) {
        return await sendReactionMessage(message, Emojis.fail, "Nenhum usuário mencionado.");
    }
    const points = args.filter(x => !x.includes("@")).join(" ").trim();
    if (!points.match(/^\d+$/)) return await sendReactionMessage(message, Emojis.fail, "Valor inválido.");
    await Promise.all([...(message.mentions ?? []), message.quotedMessage?.author.jid].filter(Boolean)
        .map(async u => {
            if (!u) return;
            const member = await bot.database.member!.getChatMember(message.author?.chatJid!, u);
            if (action == "add") {
                member.points += parseInt(points);
            } else if (action == "remove") {
                member.points -= parseInt(points);
            }
            await bot.database.member?.updateChatMember(member);
        }));
    return await message.react(Emojis.success);
}

export async function listPoints(message: ParsedMessage, bot: Bot) {
    const members = await bot.database.member!.getAllChatMembers(message.author?.chatJid!);
    const text = "Pontuação atual: \n" + members.filter(s => s.points != 0)
        .map(u => `- ${u.id}: ${u.points}`)
        .join("\n");
    return await sendReactionMessage(message, Emojis.success, text);
}

export async function pointsManager(message: ParsedMessage, args: string[], bot: Bot) {
    if (args.includes("remover")) {
        return await pointsAddSub(message, args.filter(s => s != "remover"), bot, "remove");
    }
    if (args.includes("listar")) {
        return await listPoints(message, bot);
    }
    return await pointsAddSub(message, args.filter(s => s != "add"), bot, "add");
}
