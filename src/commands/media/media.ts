import { Command } from "../../configs/commands.js";
import { sticker } from "./sticker.js";

export const MediaCommands: Command[] = [
    {
        name: "sticker",
        callable: sticker,
        category: "media",
        description: "Tranformar imagem ou video em figurinha",
        examples: [
            "$prefix$sticker: Cria uma figurinha"
        ],
        aliases: [
            "s", "fig", "f"
        ]
    }
];
