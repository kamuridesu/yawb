import { DatabaseFactory } from "./db/factory.js";
import { State } from "../core/state/state.js";

export type BotConfig = {
    name: string;
    ownerNumber: string;
    stateStorage: State;
    database: DatabaseFactory;
}
