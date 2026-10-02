const path = require("path");
const { createClient } = require("@libsql/client");

const DEFAULT_LOCAL_PATH = path.join(__dirname, "..", "data", "question-sets.db");

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${DEFAULT_LOCAL_PATH}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let ready = null;

function initDb() {
  if (!ready) {
    ready = client.execute(`
      CREATE TABLE IF NOT EXISTS question_sets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        mechanic TEXT NOT NULL,
        theme TEXT NOT NULL,
        questions TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
  }
  return ready;
}

module.exports = { client, initDb };
