import { Emojis } from "../common/emojis.js";
import { ParsedMessage } from "../core/message/types.js";

export async function sendReactionMessage(message: ParsedMessage, reaction: Emojis, text: string) {
    await message.react(reaction);
    await message.reply(text);
}
