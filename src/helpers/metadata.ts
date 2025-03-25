import { existsSync, writeFileSync } from "fs";
import path from "path";

export function addStickerMetadata(author: string, pack: string) {
    author = author.replace(/[^a-zA-Z0-9]/g, '');
    pack = pack.replace(/[^a-zA-Z0-9]/g, '');
    const exifPath = path.join("/tmp", `${author}-${pack}.exif`);

    if (existsSync(exifPath)) {
        return exifPath;
    }

    const packData = JSON.stringify({
        "sticker-pack-name": pack,
        "sticker-pack-publisher": author,
    });

    const exifLittleEndian = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00]);
    const exifBytesHeader = [0x00, 0x00, 0x16, 0x00, 0x00, 0x00];

    let infoSize = packData.length;
    let lastByte;

    if (infoSize > 256) {
        // Big endian
        infoSize = infoSize - 256;
        exifBytesHeader.unshift(0x01);
    } else {
        // Little endian
        exifBytesHeader.unshift(0x00);
    }

    lastByte = infoSize.toString(16);
    if (infoSize < 16) {
        lastByte = "0" + infoSize;
    }

    const lastBuffer = Buffer.from(lastByte, "hex");
    const headerBuffer = Buffer.from(exifBytesHeader);
    const jsonBuffer = Buffer.from(packData);

    const buffer = Buffer.concat([exifLittleEndian, lastBuffer, headerBuffer, jsonBuffer]);

    writeFileSync(exifPath, buffer);
}
