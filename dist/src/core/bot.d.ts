import { BotConfig } from "../configs/botConfig.js";
export declare class Bot {
    name: string;
    ownerId: string;
    botNumber?: string;
    private sock?;
    private language;
    private groupCache;
    constructor(config: BotConfig);
    init(): Promise<void>;
}
