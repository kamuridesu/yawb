import { ParsedMessage } from "../../core/message/types.js";
import { Bot } from "../../core/bot.js";
import { Emojis } from "src/common/emojis.js";
import { listMessages, pointsManager } from "../admin/chat.js";

export async function list(message: ParsedMessage, args: string[], bot: Bot) {

    const knownVerbs = ["mensagens", "msg", "pts", "pontos", "filters", "filtros"];

    const sendErrMsg = async (non: string) => {
        return await message.reply(
            `Argumento ${non} não reconhecido! Os tipos aceitos são: \n- ${knownVerbs.join("\n- ")}`,
            Emojis.fail
        );
    }

    if ((args.filter(x => knownVerbs.includes(x))).length < 1) {
        return await sendErrMsg(args.join(" "));
    }

    if (!knownVerbs.includes(args[0])) {
        return await sendErrMsg(args[0]);
    }

    if (["mensagem", "msg"].includes(args[0])) {
        return await listMessages(message, args.slice(1), bot);
    }

    if (["pontos", "pts"].includes(args[0])) {
        
    }

    if (["filters", "filtros"].includes(args[0])) {
        args = args.slice(1);
        args.push("listar");
        return await pointsManager(message, args, bot);
    }

}
