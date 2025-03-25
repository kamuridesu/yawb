import { Emojis } from "../../common/emojis.js";
import { Bot } from "../../core/bot.js";
import { ParsedMessage } from "../../core/message/types.js";
import { isGroupAndAdmin } from "./guards.js";

export async function banUser(message: ParsedMessage, _: string[], bot: Bot) {
    if (!(await isGroupAndAdmin(message))) return;
    if (!(await message.group?.isBotAdmin())) return await message.reply(`${bot.name} não é admin.`, Emojis.fail);
    if (message.mentions!.length < 1 && !message.quotedMessage) {
        return await message.reply("Preciso que algum usuario seja mencionado.", Emojis.fail);
    }
    const users = [...message.mentions!, message.quotedMessage?.author.jid].filter(Boolean) as string[];
    await bot.updateGroupParticipants(message.author!.chatJid!, users, "remove");
}

async function warnManager(message: ParsedMessage, bot: Bot, removeWarn = false) {
    if (!(await isGroupAndAdmin(message))) return;
    if ((message.mentions ?? []).length < 1 && !message.quotedMessage) {
        return await message.reply("Preciso que algum usuario seja mencionado.", Emojis.fail);
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
        await message.reply(textMessage, Emojis.success);
    } catch (e) {
        await message.reply("Um erro ocorreu, reporte com /bug: \n\n" + e, Emojis.fail);
    }
};

async function listWarns(message: ParsedMessage, bot: Bot) {
    const chatUsers = await bot.database.member?.getAllChatMembers(message.author!.chatJid!) ?? [];
    const usersWithWarns = chatUsers.filter(u => u.warns > 0);
    const msg = usersWithWarns.length == 0 ? "Nenhum usuário com avisos encontrado."
        : "Usuários com avisos: \n- " + usersWithWarns.map(u => u.jid).join("\n- ");
    await message.reply(msg, Emojis.success);
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
    if (!(await isGroupAndAdmin(message))) return;
    if (args.length <= 0 && message.quotedMessage == undefined) {
        return await message.reply("Nenhuma mensagem enviada.", Emojis.fail);
    }
    const memberIds = (await message.group?.getMembers())?.map(member => member.id) ?? [];

    let text = args.join(" ");

    if (message.quotedMessage) {
        text = message.quotedMessage.body ?? "";
    }

    await message.reply(text, { mentions: memberIds });
    await message.react(Emojis.success);
}

export async function updateUserRole(message: ParsedMessage, bot: Bot, action: "promote" | "demote") {
    if (!(await isGroupAndAdmin(message))) return;
    if (!(await message.group?.isBotAdmin())) {
        return await message.reply(`${bot.name} não é admin`, Emojis.fail);
    }

    if ((message.mentions?.length ?? 0 < 1) && !message.quotedMessage) {
        return await message.reply("Nenhum usuário mencionado.", Emojis.fail);
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
    await message.reply(textMsg, Emojis.success);
}

export async function promote(message: ParsedMessage, _: string[], bot: Bot) {
    return await updateUserRole(message, bot, "promote");
}

export async function demote(message: ParsedMessage, _: string[], bot: Bot) {
    return await updateUserRole(message, bot, "demote");
}

export async function setPrefix(message: ParsedMessage, args: string[], bot: Bot) {
    if (!(await isGroupAndAdmin(message))) return;

    const newPrefix = args.join(" ").trim();
    console.log(`Prefix: ${newPrefix}`);
    console.log(newPrefix.length);
    if (newPrefix.length > 1 || newPrefix.length <= 0) {
        return message.reply("O prefixo precisa ter 1 caractere.", Emojis.fail);
    }
    const chat = await bot.database.chat!.getChat(message.author!.chatJid!);
    chat.prefix = newPrefix;
    await bot.database.chat?.updateChat(chat);
    await message.react(Emojis.success);
}

export async function pointsAddSub(message: ParsedMessage, args: string[], bot: Bot, action: "add" | "remove") {
    if (!(await isGroupAndAdmin(message))) return;
    if (args.length < 1) {
        return await message.reply("Faltando número de pontos.", Emojis.fail);
    }
    if ((message.mentions ?? []).length < 1 && message.quotedMessage === undefined) {
        return await message.reply("Nenhum usuário mencionado.", Emojis.fail);
    }
    const points = args.filter(x => !x.includes("@")).join(" ").trim();
    if (!points.match(/^\d+$/)) return await message.reply("Valor inválido.", Emojis.fail);
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
    const members = (await bot.database.member!.getAllChatMembers(message.author?.chatJid!)).filter(u => u.jid != "");
    const text = "Pontuação atual: \n" + members.filter(s => s.points != 0)
        .map(u => `- ${u.jid}: ${u.points}`)
        .join("\n");
    return await message.reply(text, Emojis.success);
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

export async function banUsersBelowMessageThreshold(message: ParsedMessage, args: string[], bot: Bot) {
    if (!(await isGroupAndAdmin(message))) return;
    if (!(await message.group?.isBotAdmin())) {
        return await message.reply(`${bot.name} não é admin.`, Emojis.fail);
    }
    if (args.length < 1) {
        return await message.reply("Preciso do número de mensagens minimas", Emojis.fail);
    }
    const valueStr = args.filter(x => !x.includes("@")).join(" ").trim();
    if (!valueStr.match(/^\d+$/)) return await message.reply("Número de mensagens inválido.", Emojis.fail);
    const value = parseInt(valueStr);
    const usersBelowThreshold = (await bot.database.member!.getAllChatMembers(message.author?.chatJid!))
        .filter(u => u.messages < value)
        .map(u => u.jid);
    if (usersBelowThreshold.length < 1) {
        return await message.reply(`Nenhum usuário com mensagens menor que ${value} encontrado.`, Emojis.success);
    }
    await bot.updateGroupParticipants(message.author?.chatJid!, usersBelowThreshold, "remove");
    await Promise.all(usersBelowThreshold
        .map(async u =>
            await bot.database.member?.deleteMemberFromChat(message.author?.chatJid!, u)));
    return await message.reply("Usuários removidos: \n" + usersBelowThreshold.join("\n-"), Emojis.success);
}

export async function listMessages(message: ParsedMessage, args: string[], bot: Bot) {
    if (args.includes("remover")) {
        return await banUsersBelowMessageThreshold(message, args.filter(s => s != "remover"), bot);
    }
    const users = (await bot.database.member!.getAllChatMembers(message.author?.chatJid!)).filter(u => u.jid !== "");
    const valueStr = args.filter(x => !x.includes("@")).join(" ").trim();
    let text = "Messagens por usuários:\n- "
    if (!valueStr.match(/^\d+$/)) {
        text += users.map(u => `${u.jid}: ${u.messages}`).join("\n- ");
    } else {
        const value = parseInt(valueStr);
        text += users.filter(u => u.messages < value).map(u => `${u.jid}: ${u.messages}`).join("\n- ");
    }
    return await message.reply(text, Emojis.success);
}

export async function silenceUser(message: ParsedMessage, args: "mute" | "unmute", bot: Bot) {
    if (!(await isGroupAndAdmin(message))) return;
    if (!(await message.group?.isBotAdmin())) {
        return await message.reply(`${bot.name} não é admin.`, Emojis.fail);
    }
    if ((message.mentions ?? []).length < 1 && !message.quotedMessage) {
        return await message.reply("Nenhum usuário mencionado.", Emojis.fail);
    }
    const mentionedUsers = [...(message.mentions ?? []), message.quotedMessage?.author.jid].filter(Boolean);
    const users = (await Promise
        .all(mentionedUsers
            .filter(u => u !== undefined)
            .map(u => bot.database.member?.getChatMember(message.author?.chatJid!, u))))
        .filter(u => u !== undefined);
    const text = `Usuários ${args == "mute" ? "mutados" : "desmutados"}: \n` + 
        (await Promise.all(users.map(async u => {
            console.log("Muting " + u.jid);
            u.silenced = args == "mute" ? 1 : 0;
            await bot.database.member?.updateChatMember(u);
            return u.jid;
        }))).join("\n- ");
    return await message.reply(text, Emojis.success);
}

export async function reset(message: ParsedMessage, args: string[], bot: Bot) {
    const users = await bot.database.member?.getAllChatMembers(message.author?.chatJid!) ?? [];
    if (!(args.includes("mensagens") || args.includes("msg")) && (!args.includes("points") || args.includes("pontos"))) {
        return await message.reply(
            "Verbo não reconhecido. Verbos suportados: `mensagens`, `msg`, `points`, `pontos`",
            Emojis.fail
        );
    }
    await Promise.all(users.map(async u => {
        args.includes("mensagens") || args.includes("msg")
            ? u.messages = 0
            : u.points = 0;
        await bot.database.member?.updateChatMember(u);
    }));
    return await message.react(Emojis.success);
}
