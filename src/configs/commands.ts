import { Bot } from "../core/bot.js";
import { ParsedMessage } from "../core/parsers.js";

export type Command = {
    callable: (message: ParsedMessage, args: string[], bot: Bot) => Promise<void>,
    category: string;
    name: string;
    description: string;
    examples: string[];
    aliases: string[];
};

export type Category = {
    name: string;
    commands: Command[];
}
