// server.js
import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware — «прослойки», которые обрабатывают каждый запрос
// CORS — разрешаем только свои домены
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://roma111-ai.github.io",
];

app.use(cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (например, из Postman/curl)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS: домен не разрешён: " + origin));
    }
  },
  credentials: false,
}));                    // разрешает запросы из других доменов
app.use(express.json({ limit: "10mb" }));   // парсит JSON в теле запроса

// GET / — простая проверка, что сервер живой
app.get("/", (req, res) => {
  res.send("Hello, Library!");
});

// GET /api/health — проверка для мониторинга
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Путь к файлу сохранения
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAVE_FILE = path.join(__dirname, "save.json");

// GET /api/save — отдаёт сохранение
app.get("/api/save", async (req, res) => {
  try {
    const data = await fs.readFile(SAVE_FILE, "utf-8");
    const world = JSON.parse(data);
    res.json(world);
  } catch (err) {
    if (err.code === "ENOENT") {
      // Файла нет — отдаём пустой мир
      res.json({});
    } else {
      console.error("Ошибка чтения:", err);
      res.status(500).json({ error: "Не удалось прочитать сохранение" });
    }
  }
});

// POST /api/save — принимает JSON и сохраняет в файл
app.post("/api/save", async (req, res) => {
  try {
    const world = req.body;

    // Проверка: не пустой ли запрос
    if (!world || typeof world !== "object" || Object.keys(world).length === 0) {
      return res.status(400).json({ error: "Пустое или невалидное тело запроса" });
    }

    // Записываем в файл
    await fs.writeFile(SAVE_FILE, JSON.stringify(world, null, 2), "utf-8");

    res.json({
      status: "ok",
      savedAt: new Date().toISOString(),
      size: JSON.stringify(world).length,
    });
  } catch (err) {
    console.error("Ошибка сохранения:", err);
    res.status(500).json({ error: "Не удалось сохранить" });
  }
});

// Запускаем сервер
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});