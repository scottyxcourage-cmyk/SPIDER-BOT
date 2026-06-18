const settings = require('../settings');
const { reply } = require('./_helper');
module.exports = async (sock, chatId, message) => {
    const menu =
`╔══════════════════════════════╗
║                              ║
║  ⚡  *C Y P H E R _ X D*  ⚡  ║
║  _The Bot That Changed_      ║
║       _The World_ 🌍         ║
║                              ║
║  v${settings.version} | 80 Commands | GPT-4  ║
╚══════════════════════════════╝

🤖 ━━━ *A I  &  T O O L S* ━━━ 🤖
◈ ai / ask — GPT-4 answers
◈ translate — Any language
◈ define — Definitions
◈ wiki — Wikipedia
◈ weather — Live weather
◈ news — Headlines
◈ calc — Calculator
◈ time — World clock
◈ currency — Converter
◈ qr — QR generator
◈ tts — Text to speech

🎵 ━━━━━ *M E D I A* ━━━━━ 🎵
◈ play — Download music 🎶
◈ tiktok — TikTok downloader
◈ tomp3 — Video to audio
◈ toimg — Sticker to image
◈ sticker — Make sticker
◈ steal — Steal sticker
◈ vv — View once reveal
◈ getdp — Profile picture
◈ savestatus — Save status

🎮 ━━━━━ *F U N* ━━━━━ 🎮
◈ joke, fact, quote, 8ball
◈ dice, roast, love, zodiac
◈ tictactoe, poll

👥 ━━ *G R O U P  A D M I N* ━━ 👥
◈ kick, kickall, promote, demote
◈ mute, unmute, lock, unlock
◈ tagall, hidetag, del, add
◈ warn, warnings, clearwarn
◈ ban, unban, setname
◈ getlink, resetlink, groupinfo
◈ admins, topmembers
◈ welcome, goodbye
◈ antilink, antibadword, antispam
◈ chatbot

🛡️ ━━━ *P R O T E C T I O N* ━━━ 🛡️
◈ anticall, antidelete
◈ antiviewonce, autoreact
◈ autoread, autoreply
◈ autosavestatus, alwaysonline

👑 ━━━━ *O W N E R* ━━━━ 👑
◈ mode, bc, leave
◈ block, unblock, dm
◈ grouplist, session

⚙️ ━━━━ *S Y S T E M* ━━━━ ⚙️
◈ ping, alive, uptime, runtime
◈ owner, notes, afk, remind, password

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ *Prefix:* ${settings.prefix}
🌍 _Cypher_XD — Built Different_

_scotty©_`;

    await sock.sendMessage(chatId, { text: menu }, { quoted: message });
};
