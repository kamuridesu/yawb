import { Command } from "../../configs/commands.js";
import { slotMachine } from "./slot.js";

export const GameCommands: Command[] = [
    {
        name: "slot",
        callable: slotMachine,
        category: "games",
        description: "Escolha 3 iguais para ganhar!",
        examples: [
            "$prefix$slot: Inicia o jogo"
        ]
    }
];
