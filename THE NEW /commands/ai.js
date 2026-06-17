const axios = require('axios');
const { reply } = require('./_helper');

async function callAI(prompt) {
    // Get session cookie first
    const refererResp = await axios.get('https://stablediffusion.fr/chatgpt4', {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const cookies = (refererResp.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');

    const res = await axios.post('https://stablediffusion.fr/gpt4/predict2',
        { prompt, model: 'gpt-4' },
        {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://stablediffusion.fr/chatgpt4',
                'Cookie': cookies,
                'User-Agent': 'Mozilla/5.0'
            }
        }
    );
    return res.data?.response || res.data?.content || res.data?.message || JSON.stringify(res.data);
}

module.exports = async (sock, chatId, message, args) => {
    try {
        const q = args.join(' ').trim();
        if (!q) return reply(sock, chatId,
`╔══════════════════════╗
║  🤖  *CYPHER_XD AI*   ║
╚══════════════════════╝

❌ *No question provided!*
📌 Usage: *.ai <your question>*

💡 Examples:
• .ai what is quantum computing
• .ai write a poem about rain
• .ai explain black holes`, message);

        await sock.sendMessage(chatId, {
            text: `╔══════════════════════╗\n║  🤖  *CYPHER_XD AI*   ║\n╚══════════════════════╝\n\n🔄 *Processing your query...*\n💭 _${q}_`
        }, { quoted: message });

        const answer = await callAI(q);

        await reply(sock, chatId,
`╔══════════════════════╗
║  🤖  *CYPHER_XD AI*   ║
╚══════════════════════╝

❓ *Query:* ${q}

💬 *Answer:*
${answer}

━━━━━━━━━━━━━━━━━━━━━━
⚡ _Powered by GPT-4_`, message);

    } catch (e) {
        // Fallback to HuggingFace
        try {
            const q2 = args.join(' ').trim();
            const res2 = await axios.post(
                'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
                { inputs: `<s>[INST] ${q2} [/INST]`, parameters: { max_new_tokens: 300, temperature: 0.7, return_full_text: false } },
                { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
            );
            let ans = (Array.isArray(res2.data) ? res2.data[0]?.generated_text : res2.data?.generated_text) || 'No response.';
            ans = ans.replace(/<\/?s>/g, '').replace(/\[INST\]|\[\/INST\]/g, '').trim();
            await reply(sock, chatId,
`╔══════════════════════╗
║  🤖  *CYPHER_XD AI*   ║
╚══════════════════════╝

❓ *Query:* ${args.join(' ').trim()}

💬 *Answer:*
${ans}

━━━━━━━━━━━━━━━━━━━━━━
⚡ _Powered by Mistral AI_`, message);
        } catch {
            await reply(sock, chatId, '❌ AI is currently unavailable. Please try again later.', message);
        }
    }
};
