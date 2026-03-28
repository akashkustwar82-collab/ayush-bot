import login from "fca-priyansh";
import fs from "fs";
import express from "express";

// 👑 OWNER UID
const OWNER_UIDS = ["100003217223217", "100075380213877", "61554944557390"];

let mediaLoopInterval = null;
let lastMedia = null;
let stickerInterval = null;
let stickerLoopActive = false;
const lockedGroupNames = {};
let userCooldown = {};

const app = express();
app.get("/", (_, res) => res.send("<h2>🤖 Dhruv Sarkar Bot Running 🚀</h2>"));
app.listen(20782, () => console.log("🌐 Server running on port 20782"));

process.on("uncaughtException", (err) => console.error("❗", err.message));
process.on("unhandledRejection", (err) => console.error("❗", err));

// 🔐 LOGIN
login({ appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) }, (err, api) => {
if (err) return console.error("❌ Login failed:", err);

api.setOptions({ listenEvents: true });
console.log("🔥 Dhruv Sarkar Bot Successfully Logged In");

// 📩 Bot active message (owner ko)
api.sendMessage("🤖 Dhruv Sarkar Bot Active 🚀", OWNER_UIDS[0]);

api.listenMqtt(async (err, event) => {
try {
if (err || !event) return;

```
  const { threadID, senderID, body } = event;
  if (!body) return;

  // 🛑 Anti-spam cooldown (5 sec)
  if (userCooldown[senderID] && Date.now() - userCooldown[senderID] < 5000) return;
  userCooldown[senderID] = Date.now();

  const lowerBody = body.toLowerCase();

  // 👋 Auto reply
  if (lowerBody === "hi" || lowerBody === "hello") {
    return api.sendMessage("🤖 Dhruv Sarkar Bot: Hello bhai 😎 kya help chahiye?", threadID);
  }

  // 🔒 Group name lock system
  if (event.type === "event" && event.logMessageType === "log:thread-name") {
    const currentName = event.logMessageData.name;
    const lockedName = lockedGroupNames[threadID];
    if (lockedName && currentName !== lockedName) {
      await api.setTitle(lockedName, threadID);
    }
    return;
  }

  // ❗ Only owner commands
  if (!OWNER_UIDS.includes(senderID)) return;

  const args = body.trim().split(" ");
  const cmd = args[0].toLowerCase();
  const input = args.slice(1).join(" ");

  // 📛 Change all nicknames
  if (cmd === "/allname") {
    const info = await api.getThreadInfo(threadID);
    for (const uid of info.participantIDs) {
      await api.changeNickname(input, threadID, uid);
      await new Promise(r => setTimeout(r, 3000));
    }
    return api.sendMessage("🤖 Dhruv Bot: Sabka nickname change ho gaya 🔥", threadID);
  }

  // 📝 Change group name
  if (cmd === "/groupname") {
    await api.setTitle(input, threadID);
    return api.sendMessage("🤖 Dhruv Bot: Group naam update ho gaya 🔥", threadID);
  }

  // 🔒 Lock group name
  if (cmd === "/lockgroupname") {
    lockedGroupNames[threadID] = input;
    await api.setTitle(input, threadID);
    return api.sendMessage(`🔒 Dhruv Bot: Group name locked → ${input}`, threadID);
  }

  // 🔓 Unlock group name
  if (cmd === "/unlockgroupname") {
    delete lockedGroupNames[threadID];
    return api.sendMessage("🔓 Dhruv Bot: Group name unlocked", threadID);
  }

  // 🆔 UID
  if (cmd === "/uid") {
    return api.sendMessage(`🆔 Group ID: ${threadID}`, threadID);
  }

  // 🚪 Exit
  if (cmd === "/exit") {
    await api.removeUserFromGroup(api.getCurrentUserID(), threadID);
  }

  // 📸 Photo repeat (limited)
  if (cmd === "/photo") {
    api.sendMessage("📸 Send photo/video", threadID);

    const handler = (msg) => {
      if (msg.attachments && msg.threadID === threadID) {
        lastMedia = msg.attachments;
        let count = 0;

        mediaLoopInterval = setInterval(() => {
          if (count < 5) {
            api.sendMessage({ attachment: lastMedia }, threadID);
            count++;
          } else clearInterval(mediaLoopInterval);
        }, 30000);

        api.removeListener("message", handler);
      }
    };

    api.on("message", handler);
  }

  if (cmd === "/stopphoto") {
    if (mediaLoopInterval) {
      clearInterval(mediaLoopInterval);
      return api.sendMessage("🛑 Dhruv Bot: Photo stopped", threadID);
    }
  }

  // 📦 Sticker loop (limited)
  if (cmd.startsWith("/sticker")) {
    if (!fs.existsSync("Sticker.txt")) return api.sendMessage("❌ Sticker file missing", threadID);

    const delay = parseInt(cmd.replace("/sticker", ""));
    if (isNaN(delay) || delay < 5) return api.sendMessage("⏱ Min 5 sec delay do", threadID);

    const stickerIDs = fs.readFileSync("Sticker.txt", "utf8").split("\n").filter(Boolean);

    let i = 0;
    stickerLoopActive = true;

    stickerInterval = setInterval(() => {
      if (i < 10) {
        api.sendMessage({ sticker: stickerIDs[i] }, threadID);
        i++;
      } else {
        clearInterval(stickerInterval);
      }
    }, delay * 1000);

    return api.sendMessage(`📦 Dhruv Bot: Sticker sending started (${delay}s)`, threadID);
  }

  if (cmd === "/stopsticker") {
    if (stickerInterval) {
      clearInterval(stickerInterval);
      return api.sendMessage("🛑 Dhruv Bot: Sticker stopped", threadID);
    }
  }

  // 📌 Help menu
  if (cmd === "/help") {
    return api.sendMessage(`
```

╔═════『 🤖 Dhruv Sarkar Bot 』═════╗

📌 Commands:
/allname <name>
/groupname <name>
/lockgroupname <name>
/unlockgroupname
/uid
/exit
/photo
/stopphoto
/sticker<sec>
/stopsticker
/help

╚══════════════════════════════╝
🔥 Owner: Dhruv Sarkar
`, threadID);
}

```
} catch (e) {
  console.error("⚠️ Error:", e.message);
}
```

});
});
