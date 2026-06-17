const { reply } = require('./_helper');
module.exports = async (sock, chatId, message) => {
    const up = process.uptime();
    const ram = (process.memoryUsage().rss/1024/1024).toFixed(1);
    const heap = (process.memoryUsage().heapUsed/1024/1024).toFixed(1);
    await reply(sock, chatId,
`╔══════════════════════════╗
║  🖥️  *SYSTEM RUNTIME*     ║
╚══════════════════════════╝

⚙️ *Node.js:* ${process.version}
🖥️ *Platform:* ${process.platform}
💾 *RAM Used:* ${ram} MB
🧠 *Heap Used:* ${heap} MB
⏱️ *Uptime:* ${Math.floor(up/3600)}h ${Math.floor((up%3600)/60)}m
🔧 *PID:* ${process.pid}

━━━━━━━━━━━━━━━━━━━━━━━━━━
> _Cypher_XD — Peak Performance_ ⚡`, message);
};
