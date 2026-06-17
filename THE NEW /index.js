/**
 * Cypher_XD — Multi-User Web Pairing Server
 * The Bot That Changed The World 🌍
 * Deploy on Render
 */
require('dotenv').config();

const fs        = require('fs');
const path      = require('path');
const chalk     = require('chalk');
const express   = require('express');
const cors      = require('cors');
const NodeCache = require('node-cache');
const pino      = require('pino');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    jidDecode,
    makeCacheableSignalKeyStore,
    delay,
} = require('@whiskeysockets/baileys');

const { handleMessages, handleGroupParticipantUpdate } = require('./main');
const settings  = require('./settings');
const { getSender }   = require('./lib/getSender');
const { makeIsOwner } = require('./lib/isOwner');
const { isBanned }    = require('./lib/isBanned');

const PORT    = process.env.PORT || 3000;
const APP_URL = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || `http://localhost:${PORT}`;
const PAIRING_TIMEOUT = 5 * 60 * 1000;

// ── Ensure folders ─────────────────────────────────────────────────────────
['sessions', 'temp', 'data', 'public'].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const tempDir = path.join(process.cwd(), 'temp');
process.env.TMPDIR = tempDir; process.env.TEMP = tempDir; process.env.TMP = tempDir;

// Temp cleanup every 3h
setInterval(() => {
    fs.readdir(tempDir, (err, files) => {
        if (err) return;
        files.forEach(f => {
            const fp = path.join(tempDir, f);
            fs.stat(fp, (e, s) => { if (!e && Date.now() - s.mtimeMs > 3 * 60 * 60 * 1000) fs.unlink(fp, () => {}); });
        });
    });
}, 3 * 60 * 60 * 1000);

setInterval(() => { if (global.gc) global.gc(); }, 60_000);
setInterval(() => {
    const mb = process.memoryUsage().rss / 1024 / 1024;
    if (mb > 450) { console.log('⚠️ RAM high — restarting'); process.exit(1); }
}, 30_000);

// ── Stats ──────────────────────────────────────────────────────────────────
const STATS_FILE = './sessions/stats.json';
let totalPaired = 0;
try { if (fs.existsSync(STATS_FILE)) totalPaired = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')).total || 0; } catch {}
function saveStats() { try { fs.writeFileSync(STATS_FILE, JSON.stringify({ total: totalPaired })); } catch {} }

// ── Per-user message store ─────────────────────────────────────────────────
function createStore() {
    const messages = {};
    const MAX = 20;
    function bind(ev) {
        ev.on('messages.upsert', ({ messages: msgs }) => {
            msgs.forEach(msg => {
                const jid = msg.key?.remoteJid; if (!jid) return;
                if (!messages[jid]) messages[jid] = [];
                messages[jid].push(msg);
                if (messages[jid].length > MAX) messages[jid] = messages[jid].slice(-MAX);
            });
        });
    }
    async function loadMessage(jid, id) {
        return (messages[jid] || []).find(m => m.key?.id === id) || undefined;
    }
    return { bind, loadMessage };
}

// ── Active bots ────────────────────────────────────────────────────────────
const activeBots = new Map();

// ── Keep-alive ─────────────────────────────────────────────────────────────
function startKeepAlive() {
    const url = APP_URL.startsWith('http') ? APP_URL : `https://${APP_URL}`;
    setInterval(async () => {
        try { const fetch = require('node-fetch'); await fetch(`${url}/ping`); } catch {}
    }, 10 * 60 * 1000);
}

// ══════════════════════════════════════════════════════════════════════════
//  WEB SERVER
// ══════════════════════════════════════════════════════════════════════════
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/ping',  (req, res) => res.json({
    status: 'alive',
    bot: 'Cypher_XD 🌍',
    version: settings.version,
    bots: [...activeBots.values()].filter(b => b.status === 'connected').length,
    paired: totalPaired,
    uptime: Math.floor(process.uptime())
}));
app.get('/stats', (req, res) => res.json({
    total: totalPaired,
    active: [...activeBots.values()].filter(b => b.status === 'connected').length
}));

// ── POST /pair ─────────────────────────────────────────────────────────────
app.post('/pair', async (req, res) => {
    let { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required.' });
    phone = phone.replace(/[^0-9]/g, '');
    if (phone.length < 7 || phone.length > 15)
        return res.status(400).json({ error: 'Invalid number. Use international format e.g. 263788114185' });

    const existing = activeBots.get(phone);
    if (existing?.status === 'connected')
        return res.json({ success: true, status: 'already_connected', message: 'Your bot is already running!' });
    if (existing?.status === 'pairing')
        return res.status(429).json({ error: 'Pairing in progress. Enter the code in WhatsApp within 5 minutes.' });

    activeBots.set(phone, { status: 'pairing', code: null, sock: null });

    const timer = setTimeout(() => {
        const b = activeBots.get(phone);
        if (b?.status === 'pairing') {
            console.log(chalk.yellow(`⏰ Pairing expired: +${phone}`));
            try { if (b.sock) b.sock.end(); } catch {}
            activeBots.delete(phone);
            cleanSession(phone);
        }
    }, PAIRING_TIMEOUT);
    activeBots.get(phone).timer = timer;

    try {
        const code = await startPairing(phone, timer);
        return res.json({ success: true, code, phone, expires: '5 minutes' });
    } catch (err) {
        activeBots.delete(phone);
        clearTimeout(timer);
        return res.status(500).json({ error: err.message || 'Something went wrong. Please try again.' });
    }
});

app.get('/status/:phone', (req, res) => {
    const phone = req.params.phone.replace(/[^0-9]/g, '');
    const b = activeBots.get(phone);
    if (!b) return res.json({ status: 'not_found' });
    return res.json({ status: b.status, code: b.code });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(chalk.cyan(`\n╔══════════════════════════════════════╗`));
    console.log(chalk.cyan(`║  🌍  Cypher_XD — Built Different      ║`));
    console.log(chalk.cyan(`║  ⚡  Port: ${PORT}                        ║`));
    console.log(chalk.cyan(`║  📊  ${totalPaired} users paired so far       ║`));
    console.log(chalk.cyan(`╚══════════════════════════════════════╝\n`));
    console.log(chalk.green(`🔗 ${APP_URL}\n`));
    startKeepAlive();
    loadExistingSessions();
});

// ══════════════════════════════════════════════════════════════════════════
//  PAIRING
// ══════════════════════════════════════════════════════════════════════════
async function startPairing(phone, timer) {
    const sessionDir = `./sessions/${phone}`;
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const { version }          = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const userStore            = createStore();

    const sock = makeWASocket({
        version,
        logger:            pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser:           ['Ubuntu', 'Chrome', '20.0.04'],
        auth: {
            creds: state.creds,
            keys:  makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' }))
        },
        msgRetryCounterCache:  new NodeCache(),
        connectTimeoutMs:      60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs:   25000,
        markOnlineOnConnect:   true,
        getMessage: async (key) => {
            const msg = await userStore.loadMessage(jidNormalizedUser(key.remoteJid), key.id);
            return msg?.message || { conversation: '' };
        },
    });

    sock._ownerPhone = phone;
    sock._userStore  = userStore;
    sock.ev.on('creds.update', saveCreds);
    userStore.bind(sock.ev);

    const bt = activeBots.get(phone);
    if (bt) bt.sock = sock;

    await delay(2000);

    let code;
    try {
        code = await sock.requestPairingCode(phone);
        code = code?.match(/.{1,4}/g)?.join('-') || code;
    } catch (err) {
        try { sock.end(); } catch {}
        throw new Error('Could not generate code. Make sure number is registered on WhatsApp.');
    }

    const bots = activeBots.get(phone);
    if (bots) bots.code = code;
    console.log(chalk.yellow(`📱 Pairing: +${phone} | Code: ${code}`));

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            clearTimeout(timer);
            console.log(chalk.green(`✅ Connected: +${phone}`));
            const b = activeBots.get(phone); if (b) b.status = 'connected';
            totalPaired++; saveStats();

            // Auto-join channel
            setTimeout(async () => {
                try {
                    const { autoJoinChannel } = require('./lib/autojoin');
                    await autoJoinChannel(sock);
                } catch {}
            }, 5000);

            // Welcome message
            setTimeout(async () => {
                try {
                    const botNum = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    const up = process.uptime();
                    const h = Math.floor(up / 3600), m = Math.floor((up % 3600) / 60);
                    await sock.sendMessage(botNum, {
                        text:
`╔══════════════════════════════╗
║  🌍  *C Y P H E R _ X D*  🌍  ║
║  _The Bot That Changed_       ║
║       _The World_             ║
╚══════════════════════════════╝

✅ *BOT CONNECTED SUCCESSFULLY!*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 *Number:* +${phone}
🤖 *Bot:* Cypher_XD v${settings.version}
🔰 *Prefix:* ${settings.prefix}
🌐 *Server:* ${APP_URL}
⏱️ *Uptime:* ${h}h ${m}m
🧠 *AI:* GPT-4 Powered
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 *QUICK START*
🎵 Music     → *.play <song>*
🤖 AI Chat   → *.ai <question>*
👥 Tag All   → *.tagall <msg>*
🛡️ Anti-Link → *.antilink on*
📵 Anti-Call → *.anticall on*
📋 Full Menu → *.menu*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> _⚡ Cypher_XD — Built Different_ 🌍

_Spider©_Spider
                    });
                } catch (err) {
                    console.error('Welcome msg error:', err.message);
                }
            }, 3000);

            startBotHandlers(sock, phone);
        }

        if (connection === 'close') {
            const errCode = lastDisconnect?.error?.output?.statusCode;
            console.log(chalk.red(`⛔ Disconnected: +${phone} | Code: ${errCode}`));
            if (errCode === DisconnectReason.loggedOut || errCode === 401) {
                activeBots.delete(phone); cleanSession(phone); return;
            }
            const b = activeBots.get(phone);
            if (b) { b.status = 'reconnecting'; setTimeout(() => reconnectBot(phone), 5000); }
        }
    });

    return code;
}

// ══════════════════════════════════════════════════════════════════════════
//  BOT HANDLERS
// ══════════════════════════════════════════════════════════════════════════
function startBotHandlers(sock, phone) {
    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) { const d = jidDecode(jid) || {}; return d.user && d.server ? `${d.user}@${d.server}` : jid; }
        return jid;
    };

    try { const { getMode } = require('./commands/mode'); sock.public = getMode().mode !== 'private'; } catch { sock.public = true; }

    const sleepIv = setInterval(async () => { try { await sock.sendPresenceUpdate('available'); } catch {} }, 4 * 60 * 1000);
    const bt = activeBots.get(phone); if (bt) bt.sleepIv = sleepIv;

    // Always online init
    try { if (global.initAlwaysOnline) global.initAlwaysOnline(sock); } catch {}

    sock.ev.on('messages.upsert', async (update) => {
        try {
            if (update.type !== 'notify') return;
            const mek = update.messages[0];
            if (!mek?.message) return;
            if (Object.keys(mek.message)[0] === 'ephemeralMessage')
                mek.message = mek.message.ephemeralMessage.message;
            const chatId = mek.key.remoteJid;
            if (!chatId) return;
            if (chatId === 'status@broadcast') {
                try {
                    const avs = JSON.parse(fs.readFileSync('./data/autosavestatus.json', 'utf8'));
                    if (avs.enabled) await sock.readMessages([mek.key]);
                } catch {}
                return;
            }
            if (mek.key.id?.startsWith('BAE5') && mek.key.id.length === 16) return;
            await handleMessages(sock, update);
        } catch (e) {
            if (!e.message?.includes('Connection Closed') && !e.message?.includes('connection'))
                console.error(`[${phone}] Error:`, e.message);
        }
    });

    sock.ev.on('call', async (calls) => {
        try {
            const { isAnticallEnabled } = require('./commands/anticall');
            if (!isAnticallEnabled()) return;
        } catch { return; }
        for (const call of calls) {
            const jid = call.from || call.peerJid || call.chatId;
            if (!jid) continue;
            try { if (typeof sock.rejectCall === 'function' && call.id) await sock.rejectCall(call.id, jid); } catch {}
        }
    });

    sock.ev.on('group-participants.update', async (u) => {
        try { await handleGroupParticipantUpdate(sock, u); } catch {}
    });

    console.log(chalk.green(`🤖 Cypher_XD active: +${phone}`));
}

// ══════════════════════════════════════════════════════════════════════════
//  RECONNECT
// ══════════════════════════════════════════════════════════════════════════
async function reconnectBot(phone) {
    try {
        const sessionDir = `./sessions/${phone}`;
        if (!fs.existsSync(`${sessionDir}/creds.json`)) { activeBots.delete(phone); return; }

        const { version }          = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const userStore            = createStore();

        const sock = makeWASocket({
            version, logger: pino({ level: 'silent' }), printQRInTerminal: false,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })) },
            msgRetryCounterCache: new NodeCache(), connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000, keepAliveIntervalMs: 25000, markOnlineOnConnect: true,
            getMessage: async (key) => {
                const msg = await userStore.loadMessage(jidNormalizedUser(key.remoteJid), key.id);
                return msg?.message || { conversation: '' };
            },
        });

        sock._ownerPhone = phone;
        sock._userStore  = userStore;
        sock.ev.on('creds.update', saveCreds);
        userStore.bind(sock.ev);

        const bt = activeBots.get(phone);
        if (bt) { bt.sock = sock; bt.status = 'reconnecting'; }

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                console.log(chalk.green(`✅ Reconnected: +${phone}`));
                const b = activeBots.get(phone); if (b) b.status = 'connected';
                setTimeout(async () => {
                    try { const { autoJoinChannel } = require('./lib/autojoin'); await autoJoinChannel(sock); } catch {}
                }, 5000);
                startBotHandlers(sock, phone);
            }
            if (connection === 'close') {
                const errCode = lastDisconnect?.error?.output?.statusCode;
                if (errCode === DisconnectReason.loggedOut || errCode === 401) {
                    activeBots.delete(phone); cleanSession(phone); return;
                }
                const b = activeBots.get(phone);
                if (b) { b.status = 'reconnecting'; setTimeout(() => reconnectBot(phone), 10000); }
            }
        });
    } catch (e) {
        console.error(`Reconnect error +${phone}:`, e.message);
        setTimeout(() => reconnectBot(phone), 15000);
    }
}

// ══════════════════════════════════════════════════════════════════════════
//  LOAD EXISTING SESSIONS
// ══════════════════════════════════════════════════════════════════════════
async function loadExistingSessions() {
    try {
        const dirs = fs.readdirSync('./sessions').filter(d => {
            if (d === 'stats.json') return false;
            const dp = path.join('./sessions', d);
            try { return fs.statSync(dp).isDirectory() && fs.existsSync(path.join(dp, 'creds.json')); } catch { return false; }
        });
        if (!dirs.length) { console.log(chalk.yellow('📭 No existing sessions')); return; }
        console.log(chalk.cyan(`♻️ Restoring ${dirs.length} session(s)...`));
        for (const phone of dirs) {
            if (activeBots.has(phone)) continue;
            activeBots.set(phone, { status: 'reconnecting', code: null, sock: null });
            await delay(2000);
            reconnectBot(phone);
        }
    } catch (e) { console.error('Load sessions error:', e.message); }
}

function cleanSession(phone) {
    try { const d = `./sessions/${phone}`; if (fs.existsSync(d)) fs.rm(d, { recursive: true, force: true }, () => {}); } catch {}
}

process.on('uncaughtException',  e => { if (!e.message?.includes('Connection')) console.error('Uncaught:', e.message); });
process.on('unhandledRejection', e => { if (!String(e)?.includes('Connection')) console.error('Rejection:', e); });
