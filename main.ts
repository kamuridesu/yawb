import { Bot } from "./src/core/bot.js";

(async () => {
    const bot = new Bot({name: "test", ownerNumber: "test", language: "test"});
    await bot.init();
})()
