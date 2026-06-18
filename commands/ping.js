const { reply } = require('./_helper');
module.exports = async (sock, chatId, message) => {
    const start = Date.now();
    await sock.sendMessage(chatId, { text: '⚡ Calculating...' }, { quoted: message });
    const ms = Date.now() - start;
    const status = ms < 100 ? '🟢 Excellent' : ms < 300 ? '🟡 Good' : '🔴 Slow';
    await reply(sock, chatId,
`╔══════════════════════════╗
║  ⚡  *CYPHER_XD PING*  ⚡ ║
╚══════════════════════════╝

🏓 *Pong!*
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ Speed: *${ms}ms*
📶 Status: ${status}
🤖 Bot: *Online*
🧠 System: *Nominal*
━━━━━━━━━━━━━━━━━━━━━━━━━━
> _Cypher_XD — Built Different_ 🌍`, message);
};
