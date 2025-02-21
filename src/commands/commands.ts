import { AdminCommands } from "./admin/admin.js";
import { Bot } from "../core/bot.js";
import { ParsedMessage } from "../core/message/types.js";

const AllCommands = [...AdminCommands];

export async function commandHandleProvisory(command: string, message: ParsedMessage, args: string[], bot: Bot) {
    console.log("Received command: " + command);
    const cmd = AllCommands.find(cmd => cmd.name == command || (cmd.aliases != undefined && cmd.aliases.includes(command)));
    console.log(cmd);
    await cmd?.callable(message, args, bot);
}

