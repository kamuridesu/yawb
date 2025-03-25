import { AdminCommands } from "./admin/admin.js";
import { Bot } from "../core/bot.js";
import { ParsedMessage } from "../core/message/types.js";
import { GameCommands } from "./games/game.js";
import { Command } from "../configs/commands.js";
import { MediaCommands } from "./media/media.js";

function buildCommandArray() {
    const allCmds = [...AdminCommands, ...GameCommands, ...MediaCommands];
    const seemNameAndAlias: string[] = [
        "help", "ajuda", "menu"
    ];
    for (const command of allCmds) {
        if (seemNameAndAlias.includes(command.name) || (command.aliases?.filter(x => seemNameAndAlias.includes(x)) ?? []).length > 0) {
            throw new Error(`Command ${command.name} from category ${command.category} has duplicated name or alias!`);
        }
        seemNameAndAlias.push(command.name);
        seemNameAndAlias.push(...(command.aliases ?? []));
    }
    return allCmds;
}

const AllCommands = buildCommandArray();
const CategoryMap = AllCommands.reduce((acc, cmd) => {
    acc[cmd.category] ??= [];
    acc[cmd.category].push(cmd);
    return acc;
}, {} as Record<string, Command[]>);

const Categories = Object.keys(CategoryMap);

export async function dynamicMenu(category: string, bot: Bot) {
    if (!category) {
        return `< ${bot.name} >\n\n Categorias de comandos disponíveis: \n\n- ` + Categories.join("\n- ");
    }
    if (!Categories.includes(category)) {
        return (`Categoria ${category} não encontrada.`);
    }
    const categoryCommands = CategoryMap[category];
    return `< ${bot.name} >\n\n Comandos da categoria ${category}: \n\n- ` +
        categoryCommands.map(x => x.name).join("\n- ");
}

export async function help(commandOrAlias: string) {
    const command = AllCommands.find(x => x.aliases?.includes(commandOrAlias) || x.name === commandOrAlias);
    if (!command) {
        return `Comando ${commandOrAlias} não existe!`;
    }
    return `Comando: ${command.name}\n\nDescrição: \n "${command.description}"${command.aliases ? "\n\n Apelidos: \n-"  + command.aliases.join("\n- ") : ""}`
}

export async function commandHandler(command: string, message: ParsedMessage, args: string[], bot: Bot) {
    console.log("Received command: " + command);
    const cmd = AllCommands.find(cmd => cmd.name == command || (cmd.aliases != undefined && cmd.aliases.includes(command)));
    console.log(cmd);
    await cmd?.callable(message, args, bot);
}
