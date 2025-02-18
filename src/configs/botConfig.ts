import { DatabaseFactory } from "../db/factory.js";
import { State } from "../core/storage/state.js";

export type BotConfig = {
    name: string;
    ownerNumber: string;
    stateStorage: State;
    database: DatabaseFactory;
}