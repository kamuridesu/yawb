import { Command } from "../../configs/commands.js";
import { startBot, stopBot } from "./bot.js";
import { demote, mentionUsers, pointsManager, promote, setPrefix, warn } from "./chat.js";

export const AdminCommands: Command[] = [
    {
        name: "start",
        callable: startBot,
        description: "Inicia o bot",
        examples: ["$prefix$start"],
        category: "admin",
    },
    {
        name: "stop",
        callable: stopBot,
        description: "Para o bot",
        examples: ["$prefix$stop"],
        category: "admin",
    },
    {
        name: "warn",
        callable: warn,
        description: "Gerencia os avisos de usuários. Com 4 avisos, o usuário é banido.",
        examples: ["$prefix$warn: adiciona um aviso",
            "$prefix$warn remover: remove um aviso",
            "$prefix$warn listar: lista os usuarios com aviso"
        ],
        category: "admin",
    },
    {
        name: "all",
        aliases: ["todos"],
        callable: mentionUsers,
        description: "Menciona todos os usuários do grupo.",
        examples: ["$prefix$all: menciona todos os usuários"],
        category: "admin"
    },
    {
        name: "demote",
        aliases: ["rebaixar"],
        callable: demote,
        description: "Remove o admin de usuários.",
        examples: ["$prefix$demote @$botName$: remove o admin do bot"],
        category: "admin"
    },
    {
        name: "promote",
        aliases: ["promover"],
        callable: promote,
        description: "Da admin para usuários.",
        examples: ["$prefix$promote @user: da admin para @user"],
        category: "admin"
    },
    {
        name: "prefix",
        aliases: ["prefixo"],
        callable: setPrefix,
        description: "Muda o prefixo do bot.",
        examples: ["$prefix$prefix !: muda o prefixo para !"],
        category: "admin"
    },
    {
        name: "points",
        aliases: ["pontos"],
        callable: pointsManager,
        description: "Gerencia os pontos do grupo.",
        examples: [
            "$prefix$points listar: lista os pontos dos membros do grupo",
            "$prefix$points remover @user1 @user2 50: remove 50 pontos de membros do grupo",
            "$prefix$points @user1 @user2 50: adiciona 50 pontos de membros do grupo",
        ],
        category: "admin"
    }
]
