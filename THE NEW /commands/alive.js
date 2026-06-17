const settings = require('../settings');
const { reply } = require('./_helper');
module.exports = async (sock, chatId, message) => {
    const up = process.uptime();
    const d=Math.floor(up/86400), h=Math.floor((up%86400)/3600), m=Math.floor((up%3600)/60), s=Math.floor(up%60);
    const ram = (process.memoryUsage().rss/1024/1024).toFixed(1);
    await reply(sock, chatId,
`╔══════════════════════════╗
║  🌍  *CYPHER_XD*  🌍      ║
║   _The Bot That Changed_  ║
║        _The World_        ║
╚══════════════════════════╝

✅ *ONLINE & OPERATIONAL*

━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ *Uptime:* ${d}d ${h}h ${m}m ${s}s
💾 *RAM:* ${ram} MB
📦 *Version:* v${settings.version}
🔰 *Prefix:* ${settings.prefix}
🌐 *Mode:* ${sock.public ? 'Public' : 'Private'}
⚡ *Commands:* 80
🧠 *AI:* GPT-4 Powered
━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 _Everything running at peak performance!_`, message);
};
