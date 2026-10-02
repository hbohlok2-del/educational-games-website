const fs = require("fs");
const path = require("path");
const { createClient } = require("@libsql/client");

const DEFAULT_LOCAL_PATH = path.join(__dirname, "..", "data", "question-sets.db");

let client = null;
let initError = null;

try {
  const url = process.env.TURSO_DATABASE_URL || `file:${DEFAULT_LOCAL_PATH}`;
  if (!process.env.TURSO_DATABASE_URL) {
    fs.mkdirSync(path.dirname(DEFAULT_LOCAL_PATH), { recursive: true });
  }
  client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
} catch (err) {
  initError = err;
}

let ready = null;

function initDb() {
  if (initError) return Promise.reject(initError);
  if (!client) return Promise.reject(new Error("database client not initialized"));
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
