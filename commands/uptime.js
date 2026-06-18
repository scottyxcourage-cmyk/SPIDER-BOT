const { reply } = require('./_helper');
module.exports = async (sock, chatId, message) => {
    const up = process.uptime();
    const d=Math.floor(up/86400), h=Math.floor((up%86400)/3600), m=Math.floor((up%3600)/60), s=Math.floor(up%60);
    await reply(sock, chatId,
`╔══════════════════════════╗
║  ⏱️  *CYPHER_XD UPTIME*   ║
╚══════════════════════════╝

🟢 *Server has been running for:*

📅 Days: *${d}*
🕐 Hours: *${h}*
⏱️ Minutes: *${m}*
⏳ Seconds: *${s}*

━━━━━━━━━━━━━━━━━━━━━━━━━━
> _Cypher_XD — Always Online_ 🌍`, message);
};
