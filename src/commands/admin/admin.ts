import { Command } from "../../configs/commands.js";
import { startBot, stopBot } from "./bot.js";
import { warn } from "./chat.js";

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

    }
]