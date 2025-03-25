import { Emojis } from "../../common/emojis.js";
import { ParsedMessage } from "../../core/message/types.js";

export async function isGroupAndAdmin(message: ParsedMessage) {
    if (message.group === undefined) {
        await message.reply("Este comando pode ser usado apenas em grupos!", Emojis.fail);
        return false;
    }
    if (!(await message!.author!.isAdmin())) {
        await message.reply("Este comando pode ser usado apenas por admins!", Emojis.fail);
        return false;
    }
    return true;
}
