const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { reply, getSender } = require('./_helper');
module.exports = async (sock, chatId, message) => {
    try {
        const ctx = message.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;
        if (!quoted) return reply(sock, chatId, '❌ Reply to a view-once message with .vv', message);
        const voMsg = quoted?.viewOnceMessage?.message || quoted?.viewOnceMessageV2?.message || quoted?.viewOnceMessageV2Extension?.message || quoted;
        const imgMsg = voMsg?.imageMessage; const vidMsg = voMsg?.videoMessage;
        if (!imgMsg && !vidMsg) return reply(sock, chatId, '❌ Not a view-once media message.', message);
        const type = imgMsg ? 'image' : 'video';
        const stream = await downloadContentFromMessage(imgMsg || vidMsg, type);
        const chunks = []; for await (const c of stream) chunks.push(c);
        const buf = Buffer.concat(chunks);
        const cap = `🔓 *View Once Revealed*\n_Cypher_XD©_`;
        // Send in chat
        if (type === 'image') await sock.sendMessage(chatId, { image: buf, caption: cap }, { quoted: message });
        else await sock.sendMessage(chatId, { video: buf, caption: cap }, { quoted: message });
        // Also save to DM (bot's own number)
        try {
            const sender = getSender(sock, message);
            const dmCaption = `📥 *Saved View Once*\nFrom: @${(ctx?.participant||sender).split('@')[0]}\n_Cypher_XD©_`;
            if (type === 'image') await sock.sendMessage(sender, { image: buf, caption: dmCaption });
            else await sock.sendMessage(sender, { video: buf, caption: dmCaption });
        } catch {}
    } catch { await reply(sock, chatId, '❌ Could not reveal. Message may have expired.', message); }
};
