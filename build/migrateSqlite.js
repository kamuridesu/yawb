import fs from "fs";
import path from "path";
import { open } from "sqlite";
import pkg from 'sqlite3';
const { Database: DBDriver } = pkg

console.log("Starting migrations...");

const MIGRATIONS_FOLDER = "migrations";

const files = fs.readdirSync(MIGRATIONS_FOLDER)
                .map(x => path.join(path.join(process.cwd(), MIGRATIONS_FOLDER), x))
                .map(x => fs.readFileSync(x).toString());

const db = await open({
    filename: "database.sqlite",
    driver: DBDriver
});

for (let query of files) {
    try {
        console.log(`Running query: '${query.slice(0, 50)}...'`);
        await db.exec(query);
    } catch (e) {
        if (!e.toString().includes("duplicate column name")) {
            console.log("Error running migration: " + e);
        }
    }
}

console.log("Finished migrations");
