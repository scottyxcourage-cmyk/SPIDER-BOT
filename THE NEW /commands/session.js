const fs = require('fs');
const { reply, getIsOwner, getSender } = require('./_helper');
module.exports = async (sock, chatId, message) => {
    const sender = getSender(sock, message);
    const isOwner = getIsOwner(sock);
    if (!await isOwner(sender, sock, chatId)) return reply(sock, chatId, '❌ Owner only command.', message);
    const credsFile = `./sessions/${sock._ownerPhone}/creds.json`;
    if (!fs.existsSync(credsFile)) return reply(sock, chatId, '❌ No session file found.', message);
    const sessionId = Buffer.from(fs.readFileSync(credsFile, 'utf8')).toString('base64');
    await sock.sendMessage(chatId, {
        document: Buffer.from(sessionId),
        fileName: `CypherXD_SESSION_${sock._ownerPhone}.txt`,
        mimetype: 'text/plain',
        caption: `🔐 *Your Session File*\n\n_Keep this safe!_\n\n_scotty©_`
    }, { quoted: message });
};
