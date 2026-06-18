const yts = require('yt-search');
const axios = require('axios');
const { reply } = require('./_helper');

module.exports = async (sock, chatId, message, args) => {
    try {
        const q = args.join(' ').trim();
        if (!q) return reply(sock, chatId,
`╔══════════════════════════╗
║  🎵  *CYPHER_XD MUSIC*    ║
╚══════════════════════════╝

❌ *No song provided!*
📌 Usage: *.play <song or URL>*

💡 Examples:
• .play blinding lights
• .play https://youtu.be/xxx`, message);

        const loading = await sock.sendMessage(chatId, {
            text: `╔══════════════════════════╗\n║  🎵  *CYPHER_XD MUSIC*    ║\n╚══════════════════════════╝\n\n🔍 *Searching:* _${q}_\n⏳ _Downloading..._`
        }, { quoted: message });

        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
        let videoUrl, title = q;

        if (youtubeRegex.test(q)) {
            videoUrl = q;
        } else {
            const { videos } = await yts(q);
            if (!videos?.length) throw new Error('No results found.');
            videoUrl = videos[0].url;
            title = videos[0].title;
        }

        try { await sock.sendMessage(chatId, { delete: loading.key }); } catch {}

        const apiUrl = `https://apis-keith.vercel.app/download/dlmp3?url=${encodeURIComponent(videoUrl)}`;
        const response = await axios.get(apiUrl, { timeout: 60000 });
        const data = response.data;
        if (!data?.status || !data?.result?.downloadUrl) throw new Error('Download failed.');

        const audioUrl = data.result.downloadUrl;
        const songTitle = data.result.title || title;

        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            fileName: `${songTitle}.mp3`,
            ptt: false
        }, { quoted: message });

        await reply(sock, chatId,
`╔══════════════════════════╗
║  🎵  *CYPHER_XD MUSIC*    ║
╚══════════════════════════╝

✅ *Downloaded Successfully!*
🎶 *${songTitle}*

━━━━━━━━━━━━━━━━━━━━━━━━━━
> _Enjoy your music!_ 🎧`, message);

    } catch (e) {
        await reply(sock, chatId, `❌ *Music download failed!*\n\n_${e.message}_\n\nTry a different song name.`, message);
    }
};
