export type SelectResultType = {
    id: string;
    value: string;
    session: string;
    timestamp: string;
} | undefined;

export type Fingerprint = {
    rawId: number;
    currentIndex: number;
    deviceIndexes: number[];
};

export type AppDataSync = {
    keyData: Uint8Array;
    fingerprint: Fingerprint;
    timestamp: number;
};
