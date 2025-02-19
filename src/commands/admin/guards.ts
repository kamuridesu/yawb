import { Emojis } from "../../common/emojis.js";
import { ParsedMessage } from "../../core/parsers.js";

export async function isGroupAndMemberIsAdmin(message: ParsedMessage) {
    if (message.group === undefined) {
        await message.react(Emojis.fail);
        await message.reply("Este comando pode ser usado apenas em grupos!");
        return false;
    }
    return message!.author!.isAdmin;
}


