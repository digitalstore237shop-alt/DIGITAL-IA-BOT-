const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();

const PORT =
  process.env.PORT || 8082;

const ROOT =
  __dirname;

const CONFIG =
  path.join(
    ROOT,
    "config.json"
  );

const LOG_DIR =
  path.join(
    ROOT,
    "logs"
  );

const LOG_FILE =
  path.join(
    LOG_DIR,
    "bot.log"
  );

fs.mkdirSync(
  LOG_DIR,
  {
    recursive: true
  }
);

app.use(
  express.json()
);

app.use(
  express.static(
    path.join(
      ROOT,
      "public"
    )
  )
);

let botProcess = null;

function getConfig() {

  return JSON.parse(
    fs.readFileSync(
      CONFIG,
      "utf8"
    )
  );
}

function saveConfig(config) {

  fs.writeFileSync(
    CONFIG,
    JSON.stringify(
      config,
      null,
      2
    )
  );
}

function writeLog(message) {

  fs.appendFileSync(
    LOG_FILE,
    `[${new Date().toISOString()}] ${message}\n`
  );
}


/*
 * STATUS
 */
app.get(
  "/api/status",
  (req, res) => {

    const config =
      getConfig();

    res.json({

      success: true,

      bot:
        config.botName,

      phone:
        config.phone,

      port:
        PORT,

      online:
        !!botProcess,

      dashboard:
        `http://localhost:${PORT}`
    });
  }
);


/*
 * CONFIG
 */
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

    const config = {

      ...getConfig(),

      ...req.body
    };

    saveConfig(
      config
    );

    writeLog(
      "Configuration modifiée."
    );

    res.json({

      success: true,

      config
    });
  }
);


/*
 * LOGS
 */
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
        "Aucun log.";
    }

    res.json({

      success: true,

      logs:
        logs.slice(-20000)
    });
  }
);


/*
 * START BOT
 */
app.post(
  "/api/bot/start",
  (req, res) => {

    if (
      botProcess
    ) {

      return res.json({

        success: false,

        message:
          "Bot déjà lancé."
      });
    }

    botProcess =
      spawn(
        "node",
        ["bot.js"],
        {
          cwd: ROOT,

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

        console.log(
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

        console.error(
          text
        );

        writeLog(
          "ERROR: " +
          text.trim()
        );
      }
    );

    botProcess.on(
      "exit",
      code => {

        writeLog(
          `Bot arrêté : ${code}`
        );

        botProcess =
          null;
      }
    );

    writeLog(
      "Bot démarré."
    );

    res.json({

      success: true,

      message:
        "Bot démarré."
    });
  }
);


/*
 * STOP BOT
 */
app.post(
  "/api/bot/stop",
  (req, res) => {

    if (
      !botProcess
    ) {

      return res.json({

        success: false,

        message:
          "Bot déjà arrêté."
      });
    }

    botProcess.kill(
      "SIGTERM"
    );

    botProcess =
      null;

    writeLog(
      "Bot arrêté."
    );

    res.json({

      success: true,

      message:
        "Bot arrêté."
    });
  }
);


/*
 * HEALTH CHECK RENDER
 */
app.get(
  "/health",
  (req, res) => {

    res.json({

      status:
        "ok",

      bot:
        "DIGITAL IA BOT",

      port:
        PORT
    });
  }
);


/*
 * DASHBOARD
 */
app.get(
  "*",
  (req, res) => {

    res.sendFile(
      path.join(
        ROOT,
        "public",
        "index.html"
      )
    );
  }
);


app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log("");
    console.log(
      "======================================"
    );
    console.log(
      "       🤖 DIGITAL IA BOT"
    );
    console.log(
      "======================================"
    );
    console.log(
      "🌐 Port : " + PORT
    );
    console.log(
      "📱 +237697929580"
    );
    console.log(
      "======================================"
    );
  }
);