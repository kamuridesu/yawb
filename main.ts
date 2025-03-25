import { DatabaseFactory, DBType } from "./src/configs/db/factory.js";
import { Bot } from "./src/core/bot.js";
import { StateSQLiteDB } from "./src/core/state/sqlitedb.js";

const database = new DatabaseFactory(DBType.SQLITE, "database.sqlite");
const state = new StateSQLiteDB({ filename: "test.db" });
(async () => {
    await state.init();
    await database.init();
    const bot = new Bot({name: "Lain", ownerNumber: "test", stateStorage: state, database: database});
    await bot.init();
})();
