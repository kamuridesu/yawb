import { File } from "../../configs/storage/storage.js";
import { Emojis } from "../../common/emojis.js";
import { Bot } from "../../core/bot.js";
import { ParsedMessage } from "../../core/message/types.js";

import pkgff from "fluent-ffmpeg";
import { exec } from "child_process";
import { addStickerMetadata } from "../../helpers/metadata.js";

export async function sticker(message: ParsedMessage, _: string[], bot: Bot) {
    if (message.mediaType == undefined && !["imageMessage", "videoMessage"].includes(message.quotedMessage?.type!)) {
        console.log(message.quotedMessage?.type);
        return await message.reply("Mensagem não é imagem ou vídeo.", Emojis.fail);
    }

    if (
        (message.quotedMessage?.type == "videoMessage" && (message.quotedMessage?.raw.quotedMessage?.videoMessage?.seconds! > 11))
        || (message.mediaType == "video" && message.raw?.message?.videoMessage?.seconds! > 11)
    ) {
        return await message.reply("Vídeo é muito longo! Use vídeos de até 11 segundos.", Emojis.fail);
    }

    const media = await message.downloadMedia();
    if (!media) {
        return await message.reply("Não consegui baixar a mídia :(", Emojis.fail);
    }
    const file = new File(`/tmp/sticker_${Math.floor(Math.random() * 1000)}.png`);
    await file.write(media);

    const targetFile = new File(`/tmp/sticker_${Math.floor(Math.random() * 1000)}.webp`);
    pkgff()
        .input(file.name)
        .on('start', (cmd) => console.log(`Executing ${cmd}`))
        .addOutputOptions(["-vcodec", "libwebp", "-vf", "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"])
        .toFormat('webp')
        .save(targetFile.name)
        .on("error", async (err) => {
            console.error(err);
            await targetFile.delete();
            await file.delete();
        })
        .on("end", async () => {
            exec(`webpmux -set exif ${addStickerMetadata(bot.name, message.author?.name ?? bot.name)} ${targetFile.name} -o ${targetFile.name}`, async (err) => {
                if (err) {
                    await file.delete();
                    await targetFile.delete();
                    console.error(err);
                    return await message.reply(`Houve um erro ao criar o sticker. Envie isso com bug: \n${err}`);
                };
                await message.reply({sticker: await targetFile.read() as Buffer}, Emojis.success);
                await file.delete();
                await targetFile.delete();
            });
        });
}
