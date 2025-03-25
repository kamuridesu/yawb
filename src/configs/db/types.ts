export type Chat = {
    chatId: string;
    isBotEnabled: number;
    prefix: string;
    adminOnly: number;
    profanityFilterEnabled: number;
    customProfanityWords: string;
}

export type Member = {
    jid: string;
    chatId: string;
    warns: number;
    points: number;
    silenced: number;
    messages: number;
}

export type Filter = {
    chatId: string;
    pattern: string;
    kind: string;
    response: string;
}
