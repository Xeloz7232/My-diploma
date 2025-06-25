require("dotenv").config();
const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const createError = require("http-errors");
const net = require("net");

// ================== Параметры демона ==================
// const LO_PATH_WIN = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;
// const LO_PATH_UNIX = "soffice";
const LO_PATH_UNIX = "/usr/bin/soffice";
const LO_HOST = "127.0.0.1";
const LO_PORT = 2002;
let sofficeProc = null;

// ============ Функция старта демон-процесса ============
function startLibreOfficeDaemon() {
  const sofficeCmd = LO_PATH_UNIX;
  const sofficeArgs = [
    "--headless",
    "--invisible",
    "--nologo",
	  "--norestore",
    "--nodefault",
    "--quickstart",
    "--minimized",
    "--nofirststartwizard",
    `--accept=socket,host=${LO_HOST},port=${LO_PORT};urp;StarOffice.ServiceManager`,
  ];

  sofficeProc = spawn(sofficeCmd, sofficeArgs, {
    stdio: "ignore",
    shell: false,
  });

  sofficeProc.on("error", (err) => {
    console.error("Не удалось запустить LibreOffice:", err);
  });

  sofficeProc.on("exit", (code, sig) => {
    console.log(`LibreOffice daemon exited with code=${code}, signal=${sig}`);
  });

  console.log(
    "LibreOffice headless daemon запущен (PID:",
    sofficeProc.pid,
    ")"
  );
}

// ========= Проверка доступности порта LO ==========
function isPortOpen(port, host = LO_HOST) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket
      .setTimeout(300)
      .once("error", () => {
        socket.destroy();
        resolve(false);
      })
      .once("timeout", () => {
        socket.destroy();
        resolve(false);
      })
      .once("connect", () => {
        socket.end();
        resolve(true);
      })
      .connect(port, host);
  });
}

// ============ Убеждаемся, что демон запущен ===========
async function ensureLibreOffice() {
  const alive = await isPortOpen(LO_PORT);
  if (!alive) {
    startLibreOfficeDaemon();
  } else {
    console.log("LibreOffice daemon уже запущен на порту", LO_PORT);
  }
}

// Запускаем проверку
ensureLibreOffice();

// ===== Обработчики graceful shutdown =====
let isShuttingDown = false;
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log("Останавливаем LibreOffice daemon...");
  sofficeProc.kill();
}

// Вешаем на все события
process.on("exit", shutdown);
process.on("SIGINT", () => { shutdown(); process.exit(0); });
process.on("SIGTERM", () => { shutdown(); process.exit(0); });
process.on("SIGUSR2", () => { shutdown(); process.exit(0); });
// ================= Express-приложение =================
const app = express();

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.set("view engine", "jade");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api", require("./routes"));

// catch 404 and forward to error handler
app.use((req, res, next) => next(createError(404)));

// error handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500).end();
});

module.exports = app;
