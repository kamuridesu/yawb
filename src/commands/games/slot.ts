import { Emojis } from "../../common/emojis.js";
import { Bot } from "../../core/bot.js";
import { ParsedMessage } from "../../core/message/types.js";
import { sendReactionMessage } from "../helpers.js";

export async function slotMachine(message: ParsedMessage, _: string[], __: Bot) {
    const fruits = Array.from('🥑🍉🍓🍎🍍🥝🍑🥥🍋🍐🍌🍒🔔🍊🍇');
    const sortedFruits: string[] = [];
    for (let i = 0; i < 3; i++) {
        sortedFruits.push(fruits[Math.floor(Math.random() * fruits.length)]);
    }
    const hasUserWon = sortedFruits.every(v => v === sortedFruits[0]);
    const text = `Consiga 3 iguais para ganhar
╔═══ ≪ •❈• ≫ ════╗
║ [💰SLOT💰 | 777 ]
║
║
║  ${sortedFruits.join(" : ")}  ◄━━┛
║
║
║ [💰SLOT💰 | 777 ]
╚════ ≪ •❈• ≫ ═══╝

${hasUserWon ? "Você ganhou! Meus parabéns" : "Você perdeu! Tente novamente."}
`

    await sendReactionMessage(message, Emojis.success, text);
}
