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

const SECRET_TOKEN = "20122008";

// Подключение к PostgreSQL (Neon)
const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_NFKnVa4SJ1Zy@ep-green-rain-b9nok8be-pooler.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
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

// GET /api/save — читает из БД (с проверкой пароля)
app.get("/api/save", async (req, res) => {
  // Проверка пароля
  const token = req.headers["x-save-token"];
  if (token !== SECRET_TOKEN) {
    return res.status(403).json({ error: "Доступ запрещён. Неверный пароль." });
  }

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

// POST /api/save — пишет в БД (с проверкой пароля)
app.post("/api/save", async (req, res) => {
  try {
    // Проверка пароля
    const token = req.headers["x-save-token"];
    if (token !== SECRET_TOKEN) {
      return res.status(403).json({ error: "Доступ запрещён. Неверный пароль." });
    }

    const world = req.body;

    if (!world || typeof world !== "object" || Object.keys(world).length === 0) {
      return res.status(400).json({ error: "Пустое или невалидное тело запроса" });
    }

    const jsonString = JSON.stringify(world);

    await pool.query(
      `INSERT INTO saves (id, data, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET data = $1::jsonb, updated_at = NOW()`,
      [jsonString]
    );

    res.json({
      status: "ok",
      savedAt: new Date().toISOString(),
      size: jsonString.length,
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