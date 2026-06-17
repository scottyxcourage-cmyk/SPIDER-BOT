const settings = require('../settings');
const { reply } = require('./_helper');
module.exports = async (sock, chatId, message) => {
    await reply(sock, chatId,
`╔══════════════════════════╗
║  👑  *CYPHER_XD OWNER*    ║
╚══════════════════════════╝

🧑‍💻 *Owner:* ${settings.botOwner}
📱 *Contact:* wa.me/${settings.ownerNumber}
🤖 *Bot:* ${settings.botName} v${settings.version}

━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 _Reach out for support or collaborations_`, message);
};
