import login from "fca-priyansh";
import fs from "fs";
import express from "express";

// 👑 OWNER UID
const OWNER_UIDS = ["100003217223217", "100075380213877", "61554944557390"];

let mediaLoopInterval = null;
let lastMedia = null;
let stickerInterval = null;
const lockedGroupNames = {};
const lockedNicknames = {};
let userCooldown = {};

const app = express();
app.get("/", (_, res) => res.send("<h2>🤖 Dhruv Sarkar Bot Running 🚀</h2>"));
app.listen(20782, () => console.log("🌐 Server running"));

process.on("uncaughtException", (err) => console.error("❗", err.message));
process.on("unhandledRejection", (err) => console.error("❗", err));

// 🔐 LOGIN
login({ appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) }, (err, api) => {
if (err) return console.error("❌ Login failed:", err);

api.setOptions({ listenEvents: true });
console.log("🔥 Dhruv Sarkar Bot Logged In");

api.listenMqtt(async (err, event) => {
try {
if (err || !event) return;

```
  const { threadID, senderID, body } = event;

  // 🔒 GROUP NAME LOCK
  if (event.type === "event" && event.logMessageType === "log:thread-name") {
    const currentName = event.logMessageData.name;
    const lockedName = lockedGroupNames[threadID];
    if (lockedName && currentName !== lockedName) {
      await api.setTitle(lockedName, threadID);
    }
    return;
  }

  // 🔒 NICKNAME LOCK (AUTO REVERT)
  if (event.type === "event" && event.logMessageType === "log:user-nickname") {
    const { participant_id, nickname } = event.logMessageData;

    if (lockedNicknames[threadID] && lockedNicknames[threadID][participant_id]) {
      const lockedName = lockedNicknames[threadID][participant_id];

      if (nickname !== lockedName) {
        await api.changeNickname(lockedName, threadID, participant_id);
      }
    }
    return;
  }

  if (!body) return;

  // 🛑 Anti-spam
  if (userCooldown[senderID] && Date.now() - userCooldown[senderID] < 5000) return;
  userCooldown[senderID] = Date.now();

  const lowerBody = body.toLowerCase();

  // 👋 Auto reply
  if (lowerBody === "hi" || lowerBody === "hello") {
    return api.sendMessage("🤖 Dhruv Bot: Hello bhai 😎", threadID);
  }

  // ❗ Owner only
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
    return api.sendMessage("✅ Sabka nickname change ho gaya", threadID);
  }

  // 🔒 LOCK ALL NICKNAME
  if (cmd === "/lockallnick") {
    const info = await api.getThreadInfo(threadID);

    if (!lockedNicknames[threadID]) lockedNicknames[threadID] = {};

    api.sendMessage("🔒 Sabka nickname lock ho raha hai...", threadID);

    for (const uid of info.participantIDs) {
      const user = await api.getUserInfo(uid);
      const name = user[uid].name;

      await api.changeNickname(name, threadID, uid);
      lockedNicknames[threadID][uid] = name;

      await new Promise(r => setTimeout(r, 2000));
    }

    return api.sendMessage("✅ Sabka nickname lock ho gaya 🔥", threadID);
  }

  // 🔓 UNLOCK ALL NICKNAME
  if (cmd === "/unlockallnick") {
    delete lockedNicknames[threadID];
    return api.sendMessage("🔓 Sabka nickname unlock ho gaya", threadID);
  }

  // 📝 Group name
  if (cmd === "/groupname") {
    await api.setTitle(input, threadID);
    return api.sendMessage("✅ Group name updated", threadID);
  }

  // 🔒 Lock group name
  if (cmd === "/lockgroupname") {
    lockedGroupNames[threadID] = input;
    await api.setTitle(input, threadID);
    return api.sendMessage("🔒 Group name locked", threadID);
  }

  // 🔓 Unlock group name
  if (cmd === "/unlockgroupname") {
    delete lockedGroupNames[threadID];
    return api.sendMessage("🔓 Group name unlocked", threadID);
  }

  // 🆔 UID
  if (cmd === "/uid") {
    return api.sendMessage(`🆔 ${threadID}`, threadID);
  }

  // 🚪 Exit
  if (cmd === "/exit") {
    await api.removeUserFromGroup(api.getCurrentUserID(), threadID);
  }

  // 📸 Photo loop (limited)
  if (cmd === "/photo") {
    api.sendMessage("📸 Send media", threadID);

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
      return api.sendMessage("🛑 Photo stopped", threadID);
    }
  }

  // 📦 Sticker loop
  if (cmd.startsWith("/sticker")) {
    if (!fs.existsSync("Sticker.txt")) return;

    const delay = parseInt(cmd.replace("/sticker", ""));
    const stickers = fs.readFileSync("Sticker.txt", "utf8").split("\n").filter(Boolean);

    let i = 0;

    stickerInterval = setInterval(() => {
      if (i < 10) {
        api.sendMessage({ sticker: stickers[i] }, threadID);
        i++;
      } else clearInterval(stickerInterval);
    }, delay * 1000);
  }

  if (cmd === "/stopsticker") {
    if (stickerInterval) {
      clearInterval(stickerInterval);
      return api.sendMessage("🛑 Sticker stopped", threadID);
    }
  }

  // 📌 Help
  if (cmd === "/help") {
    return api.sendMessage(`
```

🤖 Dhruv Sarkar Bot Commands:

/allname <name>
/lockallnick
/unlockallnick
/groupname <name>
/lockgroupname
/unlockgroupname
/uid
/exit
/photo
/stopphoto
/sticker<sec>
/stopsticker
/help
`, threadID);
}

```
} catch (e) {
  console.error("⚠️", e.message);
}
```

});
});
