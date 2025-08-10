import { AdminCommands } from "./admin/admin.js";
import { Bot } from "../core/bot.js";
import { ParsedMessage } from "../core/message/types.js";
import { GameCommands } from "./games/game.js";
import { Command } from "../configs/commands.js";
import { MediaCommands } from "./media/media.js";
import { formatMessage } from "../helpers/text.js";
import { list } from "./meta/meta.js";

let allCmds = [...AdminCommands, ...GameCommands, ...MediaCommands];
let AllCommands: Command[] = [];
let CategoryMap: Record<string, Command[]> = {};
let Categories: string[] = [];

function buildCommandArray() {
  const seemNameAndAlias: string[] = [];
  for (const command of allCmds) {
    if (
      seemNameAndAlias.includes(command.name) ||
      (command.aliases?.filter((x) => seemNameAndAlias.includes(x)) ?? [])
        .length > 0
    ) {
      throw new Error(
        `Command ${command.name} from category ${command.category} has duplicated name or alias!`,
      );
    }
    seemNameAndAlias.push(command.name);
    seemNameAndAlias.push(...(command.aliases ?? []));
  }
  return allCmds;
}

export async function dynamicMenu(category: string, bot: Bot) {
  if (!category) {
    return (
      `< ${bot.name} >\n\n Categorias de comandos disponíveis: \n\n- ` +
      Categories.join("\n- ")
    );
  }
  if (!Categories.includes(category)) {
    return `Categoria ${category} não encontrada.`;
  }
  const categoryCommands = CategoryMap[category];
  return (
    `< ${bot.name} >\n\n Comandos da categoria ${category}: \n\n- ` +
    categoryCommands.map((x) => x.name).join("\n- ")
  );
}

export async function help(message: ParsedMessage, args: string[], bot: Bot) {
  const commandOrCategory = args.join(" ");
  const command = AllCommands.find(
    (x) =>
      x.aliases?.includes(commandOrCategory) || x.name === commandOrCategory,
  );
  if (command) {
    const chat = await bot.database.chat!.getChat(message.author!.chatJid!);
    const prefix = chat.prefix;
    return await message.reply(
      `Comando: ${commandOrCategory}\n\nDescrição: \n "${command.description}"${command.aliases ? "\n\n Apelidos: \n- " + command.aliases.join("\n- ") : ""}${command.examples ? "\n\n Exemplos: \n- " + formatMessage(command.examples.join("\n- "), prefix, commandOrCategory) : ""}`,
    );
  } else {
    return message.reply(await dynamicMenu(commandOrCategory, bot));
  }
}

const MetaCommands: Command[] = [
  {
    name: "help",
    aliases: ["ajuda"],
    category: "misc",
    examples: ["$prefix$help", "$prefix$help command"],
    description: "Mostra o menu de ajuda ou a descrição de um comando",
    callable: help,
  },
  {
    name: "lista",
    callable: list,
    aliases: ["ls"],
    category: "misc",
    description: "Lista mensagens, pontos, filtros, etc",
    examples: [
      "$prefix$alias msg: lista as mensagens do grupo",
      "$prefix$alias pts: lista os pontos",
      "$prefix$alias filtros: lista os filtros",
    ],
  },
];

allCmds = [...allCmds, ...MetaCommands];
AllCommands = buildCommandArray();
CategoryMap = AllCommands.reduce(
  (acc, cmd) => {
    acc[cmd.category] ??= [];
    acc[cmd.category].push(cmd);
    return acc;
  },
  {} as Record<string, Command[]>,
);
Categories = Object.keys(CategoryMap);

console.log(CategoryMap);

export async function commandHandler(
  command: string,
  message: ParsedMessage,
  args: string[],
  bot: Bot,
) {
  console.log("Received command: " + command);
  const cmd = AllCommands.find(
    (cmd) =>
      cmd.name == command ||
      (cmd.aliases != undefined && cmd.aliases.includes(command)),
  );
  console.log(cmd);
  await cmd?.callable(message, args, bot);
}
