export type Chat = {
    chatId: string;
    isBotEnabled: number;
    prefix: string;
}

export type Member = {
    id: string;
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
