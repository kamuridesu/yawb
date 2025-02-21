import { Emojis } from "../../common/emojis.js";
import { ParsedMessage } from "../../core/message/types.js";
import { sendReactionMessage } from "../helpers.js";

export async function isGroupAndMemberIsAdmin(message: ParsedMessage) {
    if (message.group === undefined) {
        await sendReactionMessage(message, Emojis.fail, "Este comando pode ser usado apenas em grupos!");
        return false;
    }
    if (!(await message!.author!.isAdmin())) {
        await sendReactionMessage(message, Emojis.fail, "Este comando pode ser usado apenas por admins!");
        return false;
    }
    return true;
}
