CREATE TABLE IF NOT EXISTS chat (
    chatId TEXT PRIMARY KEY,
    isBotEnabled INTEGER DEFAULT 1,
    prefix VARCHAR(1) DEFAULT '/'
);

CREATE TABLE IF NOT EXISTS member (
    id TEXT,
    chatId TEXT,
    warns INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    messages INTEGER DEFAULT 0,
    silenced INTEGER DEFAULT 0,
    FOREIGN KEY(chatId) REFERENCES chat(chatId)
);

CREATE TABLE IF NOT EXISTS filter (
    chatId TEXT,
    pattern TEXT PRIMARY KEY,
    kind TEXT,
    response TEXT,
    FOREIGN KEY(chatId) REFERENCES chat(chatId)
);
