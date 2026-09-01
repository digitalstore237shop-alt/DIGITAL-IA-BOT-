const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();

const PORT = process.env.PORT || 8082;
const ROOT = __dirname;

const CONFIG_FILE = path.join(ROOT, "config.json");
const LOG_DIR = path.join(ROOT, "logs");
const LOG_FILE = path.join(LOG_DIR, "bot.log");

fs.mkdirSync(LOG_DIR, { recursive: true });

app.use(express.json());

app.use(
  express.static(
    path.join(ROOT, "public")
  )
);

let botProcess = null;


/* =========================
   UTILITAIRES
========================= */

function getConfig() {
  try {
    return JSON.parse(
      fs.readFileSync(
        CONFIG_FILE,
        "utf8"
      )
    );
  } catch (error) {
    return {
      botName: "DIGITAL IA BOT",
      phone: "237697929580",
      autoReply: true,
      welcomeMessage:
        "👋 Bonjour ! Je suis DIGITAL IA BOT. Comment puis-je t'aider ?"
    };
  }
}


function saveConfig(config) {
  fs.writeFileSync(
    CONFIG_FILE,
    JSON.stringify(
      config,
      null,
      2
    )
  );
}


function writeLog(message) {
  try {
    fs.appendFileSync(
      LOG_FILE,
      `[${new Date().toISOString()}] ${message}\n`
    );
  } catch {}
}


/* =========================
   HEALTH CHECK
========================= */

app.get(
  "/health",
  (req, res) => {

    res.status(200).json({
      status: "ok",
      bot: "DIGITAL IA BOT",
      port: PORT,
      time: new Date().toISOString()
    });

  }
);


/* =========================
   STATUS
========================= */

app.get(
  "/api/status",
  (req, res) => {

    const config = getConfig();

    res.json({

      success: true,

      bot:
        config.botName,

      phone:
        config.phone,

      port:
        PORT,

      online:
        botProcess !== null,

      platform:
        process.env.RENDER
          ? "Render"
          : "Termux"
    });

  }
);


/* =========================
   CONFIGURATION
========================= */

app.get(
  "/api/config",
  (req, res) => {

    res.json(
      getConfig()
    );

  }
);


app.post(
  "/api/config",
  (req, res) => {

    const oldConfig =
      getConfig();

    const newConfig = {
      ...oldConfig,
      ...req.body
    };

    saveConfig(
      newConfig
    );

    writeLog(
      "Configuration mise à jour."
    );

    res.json({

      success: true,

      config:
        newConfig
    });

  }
);


/* =========================
   LOGS
========================= */

app.get(
  "/api/logs",
  (req, res) => {

    let logs = "";

    try {

      logs =
        fs.readFileSync(
          LOG_FILE,
          "utf8"
        );

    } catch {

      logs =
        "Aucun log disponible.";

    }

    res.json({

      success: true,

      logs:
        logs.slice(-30000)

    });

  }
);


/* =========================
   START BOT
========================= */

app.post(
  "/api/bot/start",
  (req, res) => {

    if (botProcess) {

      return res.json({

        success: false,

        message:
          "DIGITAL IA BOT est déjà démarré."

      });

    }

    try {

      botProcess =
        spawn(
          process.execPath,
          ["bot.js"],
          {
            cwd: ROOT,

            env: {
              ...process.env
            },

            stdio: [
              "ignore",
              "pipe",
              "pipe"
            ]
          }
        );


      botProcess.stdout.on(
        "data",
        data => {

          const text =
            data.toString();

          process.stdout.write(
            text
          );

          writeLog(
            text.trim()
          );

        }
      );


      botProcess.stderr.on(
        "data",
        data => {

          const text =
            data.toString();

          process.stderr.write(
            text
          );

          writeLog(
            "ERROR: " +
            text.trim()
          );

        }
      );


      botProcess.on(
        "error",
        error => {

          writeLog(
            "Erreur processus bot : " +
            error.message
          );

          botProcess = null;

        }
      );


      botProcess.on(
        "exit",
        (code, signal) => {

          writeLog(
            `Bot arrêté. code=${code} signal=${signal}`
          );

          botProcess = null;

        }
      );


      writeLog(
        "DIGITAL IA BOT démarré."
      );


      res.json({

        success: true,

        message:
          "DIGITAL IA BOT démarré."

      });

    } catch (error) {

      botProcess = null;

      writeLog(
        "Erreur démarrage : " +
        error.message
      );

      res.status(500).json({

        success: false,

        message:
          error.message

      });

    }

  }
);


/* =========================
   STOP BOT
========================= */

app.post(
  "/api/bot/stop",
  (req, res) => {

    if (!botProcess) {

      return res.json({

        success: false,

        message:
          "DIGITAL IA BOT est déjà arrêté."

      });

    }


    try {

      botProcess.kill(
        "SIGTERM"
      );

      writeLog(
        "Arrêt demandé pour DIGITAL IA BOT."
      );

      botProcess = null;


      res.json({

        success: true,

        message:
          "DIGITAL IA BOT arrêté."

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        message:
          error.message

      });

    }

  }
);


/* =========================
   BOT INFO
========================= */

app.get(
  "/api/info",
  (req, res) => {

    const config =
      getConfig();

    res.json({

      name:
        config.botName,

      phone:
        config.phone,

      port:
        PORT,

      whatsapp:
        true,

      pairing:
        true,

      qr:
        false

    });

  }
);


/* =========================
   ROUTE DASHBOARD
========================= */

/*
 * IMPORTANT :
 * Ne pas utiliser app.get("*")
 * avec Express récent.
 *
 * Cette syntaxe évite l'erreur :
 * Missing parameter name at index 1: *
 */

app.get(
  "/{*splat}",
  (req, res) => {

    const indexFile =
      path.join(
        ROOT,
        "public",
        "index.html"
      );

    if (
      fs.existsSync(indexFile)
    ) {

      return res.sendFile(
        indexFile
      );

    }

    res.status(404).send(
      "DIGITAL IA BOT - Dashboard introuvable."
    );

  }
);


/* =========================
   DEMARRAGE
========================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log("");
    console.log(
      "=========================================="
    );
    console.log(
      "        🤖 DIGITAL IA BOT"
    );
    console.log(
      "=========================================="
    );
    console.log(
      `🌐 PORT : ${PORT}`
    );
    console.log(
      "📱 WHATSAPP : +237697929580"
    );
    console.log(
      `❤️ HEALTH : /health`
    );
    console.log(
      "🔗 PAIRING : activé"
    );
    console.log(
      "📷 QR : désactivé"
    );
    console.log(
      "=========================================="
    );
    console.log("");

    writeLog(
      `Serveur démarré sur le port ${PORT}.`
    );

  }
);


/* =========================
   ARRET PROPRE
========================= */

function shutdown() {

  console.log(
    "Arrêt de DIGITAL IA BOT..."
  );

  if (botProcess) {

    try {
      botProcess.kill(
        "SIGTERM"
      );
    } catch {}

    botProcess = null;
  }

  process.exit(0);
}


process.on(
  "SIGTERM",
  shutdown
);

process.on(
  "SIGINT",
  shutdown
);