import { GroupMetadata, GroupParticipant, WAMessage } from "@whiskeysockets/baileys";
import { proto } from "@whiskeysockets/baileys";
import { Bot } from "../bot.js";

export const messageTypes = [
    "audioMessage",
    "videoMessage",
    "conversation",
    "imageMessage",
    "stickerMessage",
    "extendedTextMessage",
    "reactionMessage"
];

export class Author {
    jid?: string;
    name?: string;
    chatJid?: string;
    isBotOwner?: boolean;

    group?: Group;

    async isGroupOwner() {
        if (!this.group) return false;;
        return (await this.group.getAdmins()).find(x => x.admin == "superadmin" && x.id == this.jid) !== undefined;
    }

    async isAdmin() {
        if (!this.group) return false;
        return (await this.group.getAdmins()).find(x => x.id == this.jid) !== undefined;
    }
}

export class AuthorBuilder {
    private author: Author = new Author();

    setJid(jid: string) {
        this.author.jid = jid;
        return this;
    }

    setName(name: string) {
        this.author.name = name;
        return this;
    }

    setChatJid(chatJid: string) {
        this.author.chatJid = chatJid;
        return this;
    }

    setIsBotOwner(isOwner: boolean) {
        this.author.isBotOwner = isOwner;
        return this;
    }

    setGroup(group: Group) {
        this.author.group = group;
        return this;
    }

    build() {
        return this.author;
    }

}

export class Group {
    private __name?: string;
    private __description?: string;
    private __groupId?: string;
    private __members?: GroupParticipant[];
    private __admins?: GroupParticipant[];
    private __locked?: boolean;
    private __botIsAdmin?: boolean;
    private __cachedMetadata?: GroupMetadata;
    private bot: Bot;
    private jid: string;

    constructor(bot: Bot, chatJid: string) {
        this.bot = bot;
        this.jid = chatJid;
    }

    public async getCachedMetadata(): Promise<GroupMetadata | undefined> {
        if (this.__cachedMetadata !== undefined) {
            return this.__cachedMetadata;
        }
        this.__cachedMetadata = await this.bot.fetchGroupInfo(this.jid);
        return this.__cachedMetadata;
    }

    public async getName(): Promise<string | undefined> {
        if (this.__name !== undefined) {
            return this.__name;
        }
        const metadata = await this.getCachedMetadata();
        this.__name = metadata?.subject;
        return this.__name;
    }

    public async getDescription(): Promise<string | undefined> {
        if (this.__description !== undefined) {
            return this.__description;
        }
        const metadata = await this.getCachedMetadata();
        this.__description = metadata?.desc;
        return this.__description;
    }

    public async getGroupId(): Promise<string | undefined> {
        if (this.__groupId !== undefined) {
            return this.__groupId;
        }
        const metadata = await this.getCachedMetadata();
        this.__groupId = metadata?.id;
        return this.__groupId;
    }

    public async getMembers(): Promise<GroupParticipant[]> {
        if (this.__members !== undefined) {
            return this.__members;
        }
        const metadata = await this.getCachedMetadata();
        this.__members = metadata?.participants ?? [];
        return this.__members;
    }

    public async getAdmins(): Promise<GroupParticipant[]> {
        if (this.__admins !== undefined) {
            return this.__admins;
        }
        const members = await this.getMembers();
        this.__admins = members.filter((e) => e.admin === "admin" || e.admin === "superadmin");
        return this.__admins;
    }

    public async isBotAdmin(): Promise<boolean> {
        if (this.__botIsAdmin !== undefined) {
            return this.__botIsAdmin;
        }
        const admins = await this.getAdmins();
        this.__botIsAdmin = admins.some(admin => admin.id === this.bot.botNumber);
        return this.__botIsAdmin;
    }
}

export type QuotedMessage = {
    type: string;
    stanzaId: string | null | undefined;
    author: Author;
    body: string | undefined;
    raw: proto.IContextInfo;
}

type Image = {
    image: Buffer;
    caption?: string;
}

type Video = {
    video: Buffer;
    caption?: string;
    gifPlayback?: boolean;
}

type Audio = {
    audio: Buffer;
    mimetype: string;
}

type Sticker = {
    sticker: Buffer;
}

export type Media = Audio | Video | Image | Sticker;

export class ParsedMessage {
    id?: string | null;
    body?: string;
    author?: Author;
    group?: Group;
    mediaType?: "audio" | "video" | "image";
    mentions?: string[];
    quotedMessage?: QuotedMessage;
    raw?: WAMessage;
    bot?: Bot;

    async reply(text: string, options?: object): Promise<void>;
    async reply(text: string, reaction: string, options?: object): Promise<void>;
    async reply(media: Media, options?: object): Promise<void>;
    async reply(media: Media, reaction: string, options?: object): Promise<void>;
    async reply(textOrMedia: string | Media, secondParam?: string | object, thirdParam?: object): Promise<void> {
        const isReaction = typeof secondParam === 'string';
        const reaction = isReaction ? secondParam : undefined;
        const options = (isReaction ? thirdParam : secondParam) ?? {};
        const opts: any = Object.assign({}, options);
        opts.quoted = this.raw;

        if (textOrMedia) {
            await this.bot?.sendTextMessage(this.author!.chatJid!, textOrMedia, opts);
        }

        if (reaction) {
            await this.react(reaction);
        }
    }

    async downloadMedia() {
        const messageMedia =
            this.quotedMessage !== undefined
                ? JSON.parse(JSON.stringify(this.raw).replace("quotedM", "m")).message.extendedTextMessage.contextInfo
                : this.raw;
        return await this.bot?.downloadMedia(messageMedia as any);
    }

    async react(emoji: string) {
        await this.bot?.reactToMessage(this, emoji);
    }

    async edit(text: string) {
        await this.bot?.sendTextMessage(this.author!.chatJid!, text, { edit: this.raw?.key });
    }

    async delete() {
        await this.bot?.deleteMessage(this.author?.chatJid!, this.raw!.key);
    }
}

export class ParsedMessageBuilder {

    private parsedMessage = new ParsedMessage();

    constructor() { }

    setId(id: string | undefined | null) {
        this.parsedMessage.id = id;
        return this;
    }

    setBody(body: string) {
        this.parsedMessage.body = body;
        return this;
    }

    setAuthor(author: Author) {
        this.parsedMessage.author = author;
        return this;
    }

    setGroup(group: Group) {
        this.parsedMessage.group = group;
        return this;
    }

    setMentions(mentions: string[]) {
        this.parsedMessage.mentions = mentions;
        return this;
    }

    setQuotedMessage(quotedMessage: QuotedMessage) {
        this.parsedMessage.quotedMessage = quotedMessage;
        return this;
    }

    setRaw(raw: WAMessage) {
        this.parsedMessage.raw = raw;
        return this;
    }

    setBot(bot: Bot) {
        this.parsedMessage.bot = bot;
        return this;
    }

    setMediaType(mediaType: "audio" | "video" | "image") {
        this.parsedMessage.mediaType = mediaType;
        return this;
    }

    build() {
        if (!this.parsedMessage.id) {
            console.log(this.parsedMessage.id);
            console.log(this.parsedMessage.raw);
            throw new Error("Error parsing message, missing required fields");
        }
        return this.parsedMessage;
    }
}
