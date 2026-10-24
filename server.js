// server.js
import express from "express";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://roma111-ai.github.io",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS: домен не разрешён: " + origin));
    }
  },
  credentials: false,
}));

app.use(express.json({ limit: "10mb" }));

// Подключение к PostgreSQL (Neon)
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { require: true },
});

// Создаём таблицу при старте (если её нет)
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saves (
        id INTEGER PRIMARY KEY DEFAULT 1,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ Таблица saves готова");
  } catch (err) {
    console.error("❌ Ошибка инициализации БД:", err);
  }
}
initDb();

// GET /api/health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// GET /api/save — читает из БД
app.get("/api/save", async (req, res) => {
  try {
    const result = await pool.query("SELECT data FROM saves WHERE id = 1");
    if (result.rows.length === 0) {
      return res.json({});
    }
    res.json(result.rows[0].data);
  } catch (err) {
    console.error("Ошибка чтения из БД:", err);
    res.status(500).json({ error: "Не удалось прочитать сохранение" });
  }
});

// POST /api/save — пишет в БД
app.post("/api/save", async (req, res) => {
  try {
    const world = req.body;

    if (!world || typeof world !== "object" || Object.keys(world).length === 0) {
      return res.status(400).json({ error: "Пустое или невалидное тело запроса" });
    }

    await pool.query(
      `INSERT INTO saves (id, data, updated_at)
       VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW()`,
      [world]
    );

    res.json({
      status: "ok",
      savedAt: new Date().toISOString(),
      size: JSON.stringify(world).length,
    });
  } catch (err) {
    console.error("Ошибка записи в БД:", err);
    res.status(500).json({ error: "Не удалось сохранить" });
  }
});

// GET /
app.get("/", (req, res) => {
  res.send("Hello, Library! (DB version)");
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});