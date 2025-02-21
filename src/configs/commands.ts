import { ParsedMessage } from "src/core/message/types.js";
import { Bot } from "../core/bot.js";

export type Command = {
    callable: (message: ParsedMessage, args: string[], bot: Bot) => Promise<void>,
    name: string;
    category: string;
    description: string;
    examples: string[];
    aliases?: string[];
};
