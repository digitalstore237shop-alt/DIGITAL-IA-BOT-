const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");
const fs = require("fs");

const PHONE = "237697929580";
const SESSION_DIR = "./session";

async function startBot() {

  const {
    state,
    saveCreds
  } = await useMultiFileAuthState(
    SESSION_DIR
  );

  const sock = makeWASocket({
    auth: state,
    logger: P({
      level: "silent"
    }),
    browser: [
      "DIGITAL IA BOT",
      "Chrome",
      "1.0.0"
    ]
  });

  // Sauvegarde de session
  sock.ev.on(
    "creds.update",
    saveCreds
  );

  /*
   * Connexion
   */
  sock.ev.on(
    "connection.update",
    async (update) => {

      const {
        connection,
        lastDisconnect
      } = update;

      if (
        connection === "connecting"
      ) {

        console.log(
          "🔄 Connexion à WhatsApp..."
        );
      }

      if (
        connection === "open"
      ) {

        console.log("");
        console.log(
          "================================"
        );
        console.log(
          "🤖 DIGITAL IA BOT"
        );
        console.log(
          "✅ WHATSAPP CONNECTÉ"
        );
        console.log(
          "📱 +" + PHONE
        );
        console.log(
          "================================"
        );
        console.log("");
      }

      if (
        connection === "close"
      ) {

        const status =
          lastDisconnect
            ?.error
            ?.output
            ?.statusCode;

        console.log(
          "❌ Connexion fermée :",
          status
        );

        if (
          status !==
          DisconnectReason.loggedOut
        ) {

          console.log(
            "🔄 Reconnexion dans 3 secondes..."
          );

          setTimeout(
            startBot,
            3000
          );

        } else {

          console.log(
            "🔴 Session déconnectée."
          );
        }
      }
    }
  );

  /*
   * PAIRING CODE UNIQUEMENT
   *
   * Aucun QR n'est affiché.
   */
  if (
    !state.creds.registered
  ) {

    try {

      /*
       * Petite attente afin de laisser
       * la connexion s'initialiser.
       */
      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            2000
          )
      );

      const phone =
        PHONE.replace(
          /\D/g,
          ""
        );

      const code =
        await sock.requestPairingCode(
          phone
        );

      console.log("");
      console.log(
        "======================================"
      );
      console.log(
        "       🔗 PAIRING WHATSAPP"
      );
      console.log(
        "======================================"
      );
      console.log("");
      console.log(
        "📱 NUMÉRO : +" + phone
      );
      console.log(
        "🔑 CODE   : " + code
      );
      console.log("");
      console.log(
        "Dans WhatsApp :"
      );
      console.log(
        "Paramètres"
      );
      console.log(
        "→ Appareils liés"
      );
      console.log(
        "→ Lier un appareil"
      );
      console.log(
        "→ Lier avec un numéro de téléphone"
      );
      console.log("");
      console.log(
        "======================================"
      );
      console.log("");

    } catch (error) {

      console.error("");
      console.error(
        "❌ ERREUR PAIRING CODE"
      );
      console.error(
        error.message
      );
      console.error("");
    }
  }

  /*
   * Messages entrants
   */
  sock.ev.on(
    "messages.upsert",
    async ({
      messages
    }) => {

      const msg =
        messages[0];

      if (!msg)
        return;

      if (
        msg.key.fromMe
      )
        return;

      const jid =
        msg.key.remoteJid;

      if (!jid)
        return;

      const text =
        msg.message?.conversation ||
        msg.message
          ?.extendedTextMessage
          ?.text ||
        "";

      if (
        !text.trim()
      )
        return;

      console.log(
        "📩 Message reçu :",
        text
      );

      const config =
        JSON.parse(
          fs.readFileSync(
            "./config.json",
            "utf8"
          )
        );

      if (
        !config.autoReply
      )
        return;

      const lower =
        text.toLowerCase();

      let response =
        "🤖 DIGITAL IA BOT\n\n" +
        "Bonjour 👋\n\n" +
        "J'ai reçu ton message :\n" +
        text;

      if (
        lower.includes(
          "bonjour"
        ) ||
        lower.includes(
          "salut"
        ) ||
        lower.includes(
          "hello"
        )
      ) {

        response =
          config.welcomeMessage;
      }

      if (
        lower ===
        "menu"
      ) {

        response =
          "🤖 DIGITAL IA BOT\n\n" +
          "📋 MENU\n\n" +
          "1️⃣ Assistance\n" +
          "2️⃣ Informations\n" +
          "3️⃣ IA\n\n" +
          "Écris simplement ta demande.";
      }

      try {

        await sock.sendMessage(
          jid,
          {
            text: response
          }
        );

        console.log(
          "📤 Réponse envoyée."
        );

      } catch (error) {

        console.error(
          "❌ Erreur envoi :",
          error.message
        );
      }
    }
  );
}

startBot().catch(
  error => {

    console.error(
      "❌ Erreur fatale :"
    );

    console.error(
      error
    );

    process.exit(1);
  }
);