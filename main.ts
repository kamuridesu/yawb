import { Bot } from "./src/core/bot.js";

(async () => {
    const bot = new Bot({name: "test", ownerNumber: "test"});
    await bot.init();
})()
