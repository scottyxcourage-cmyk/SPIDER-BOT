/**
 * Cypher_XD — Main Message Handler
 * The Bot That Changed The World 🌍
 * Signature: Ben©
 */
const fs = require('fs');
const path = require('path');
const settings = require('./settings');
const { isBanned }    = require('./lib/isBanned');
const { getSender }   = require('./lib/getSender');
const { makeIsOwner } = require('./lib/isOwner');
const { getMode }     = require('./commands/mode');

const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
process.env.TMPDIR = tempDir; process.env.TEMP = tempDir; process.env.TMP = tempDir;

// ── Command imports ───────────────────────────────────────────────────────
const helpCmd        = require('./commands/help');
const pingCmd        = require('./commands/ping');
const aliveCmd       = require('./commands/alive');
const uptimeCmd      = require('./commands/uptime');
const ownerCmd       = require('./commands/owner');
const runtimeCmd     = require('./commands/runtime');
const sessionCmd     = require('./commands/session');
const stickerCmd     = require('./commands/sticker');
const stealCmd       = require('./commands/steal');
const toimgCmd       = require('./commands/toimg');
const playCmd        = require('./commands/play');
const ttsCmd         = require('./commands/tts');
const vvCmd          = require('./commands/vv');
const getDpCmd       = require('./commands/getdp');
const saveStatusCmd  = require('./commands/savestatus');
const weatherCmd     = require('./commands/weather');
const wikiCmd        = require('./commands/wiki');
const newsCmd        = require('./commands/news');
const trCmd          = require('./commands/translate');
const calcCmd        = require('./commands/calc');
const defineCmd      = require('./commands/define');
const qrCmd          = require('./commands/qr');
const currencyCmd    = require('./commands/currency');
const remindCmd      = require('./commands/remind');
const timeCmd        = require('./commands/time');
const encodeCmd      = require('./commands/encode');
const decodeCmd      = require('./commands/decode');
const upperCmd       = require('./commands/upper');
const passwordCmd    = require('./commands/password');
const jokeCmd        = require('./commands/joke');
const factCmd        = require('./commands/fact');
const quoteCmd       = require('./commands/quote');
const eightballCmd   = require('./commands/eightball');
const diceCmd        = require('./commands/dice');
const roastCmd       = require('./commands/roast');
const loveCmd        = require('./commands/love');
const zodiacCmd      = require('./commands/zodiac');
const pollCmd        = require('./commands/poll');
const tttCmd         = require('./commands/tictactoe');
const notesCmd       = require('./commands/notes');
const { afkCommand, checkAfk, clearAfk } = require('./commands/afk');
const kickCmd        = require('./commands/kick');
const kickallCmd     = require('./commands/kickall');
const promoteCmd     = require('./commands/promote');
const demoteCmd      = require('./commands/demote');
const muteCmd        = require('./commands/mute');
const unmuteCmd      = require('./commands/unmute');
const lockCmd        = require('./commands/lock');
const unlockCmd      = require('./commands/unlock');
const warnCmd        = require('./commands/warn');
const warningsCmd    = require('./commands/warnings');
const clearwarnCmd   = require('./commands/clearwarn');
const delCmd         = require('./commands/del');
const tagallCmd      = require('./commands/tagall');
const hidetagCmd     = require('./commands/hidetag');
const groupinfoCmd   = require('./commands/groupinfo');
const adminsCmd      = require('./commands/admins');
const { topMembersCmd, inc } = require('./commands/topmembers');
const setnameCmd     = require('./commands/setname');
const getlinkCmd     = require('./commands/getlink');
const resetlinkCmd   = require('./commands/resetlink');
const { antilinkCommand, handleLink }       = require('./commands/antilink');
const { antibadwordCommand, handleBadword } = require('./commands/antibadword');
const { antispamCommand, handleSpam }       = require('./commands/antispam');
const { welcomeCommand, handleJoin }        = require('./commands/welcome');
const { goodbyeCommand, handleLeave }       = require('./commands/goodbye');
const { chatbotCommand, handleChatbot }     = require('./commands/chatbot');
const { modeCommand }                       = require('./commands/mode');
const banCmd         = require('./commands/ban');
const unbanCmd       = require('./commands/unban');
const { bcCommand, addUser }               = require('./commands/bc');
const { autoReplyCommand, handleAutoReply } = require('./commands/autoreply');
const { alwaysOnlineCommand, initAlwaysOnline } = require('./commands/alwaysonline');
const grouplistCmd   = require('./commands/grouplist');
const aiCmd          = require('./commands/ai');
const addCmd         = require('./commands/add');
const leaveCmd       = require('./commands/leave');
const blockCmd       = require('./commands/block');
const unblockCmd     = require('./commands/unblock');
const dmCmd          = require('./commands/dm');
const anticallCmd    = require('./commands/anticall');
const antideleteCmd  = require('./commands/antidelete');
const antivoCmd      = require('./commands/antiviewonce');
const autoreactCmd   = require('./commands/autoreact');
const autoreadCmd    = require('./commands/autoread');
const autosaveCmd    = require('./commands/autosavestatus');
const tomp3Cmd       = require('./commands/tomp3');
const tiktokCmd      = require('./commands/tiktok');

global.initAlwaysOnline = initAlwaysOnline;

async function handleMessages(sock, update) {
    try {
        const { messages, type } = update;
        if (type !== 'notify') return;
        const message = messages[0];
        if (!message?.message) return;
        if (Object.keys(message.message)[0] === 'ephemeralMessage')
            message.message = message.message.ephemeralMessage.message;

        const chatId   = message.key.remoteJid;
        const isGroup  = chatId?.endsWith('@g.us');
        const senderId = getSender(sock, message);

        if (!chatId || !senderId) return;
        if (chatId === 'status@broadcast') return;
        if (isBanned(senderId)) return;

        const isOwnerFn = makeIsOwner(sock._ownerPhone || '');

        if (getMode().mode === 'private' && !message.key.fromMe && !await isOwnerFn(senderId, sock, chatId)) return;

        if (!isGroup) { addUser(senderId); await handleAutoReply(sock, message); }

        // AFK check
        try {
            const afk = checkAfk(senderId);
            if (afk) {
                clearAfk(senderId);
                const mins = Math.round((Date.now() - afk.time) / 60000);
                await sock.sendMessage(chatId, {
                    text: `👋 Welcome back @${senderId.split('@')[0]}!\nYou were AFK for ${mins} min.\n\n_Ben©_`,
                    mentions: [senderId]
                });
            }
        } catch {}

        if (isGroup) {
            inc(chatId, senderId);
            await handleLink(sock, chatId, message);
            await handleBadword(sock, chatId, message);
            await handleSpam(sock, chatId, message, senderId);
        }

        const rawText =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption || '';

        const prefix = settings.prefix || '.';
        if (!rawText.trim().startsWith(prefix)) {
            if (rawText) await handleChatbot(sock, chatId, message, rawText);
            return;
        }

        const [cmd] = rawText.trim().slice(prefix.length).toLowerCase().split(/\s+/);
        const args  = rawText.trim().slice(prefix.length).split(/\s+/).slice(1);

        switch (cmd) {
            // SYSTEM
            case 'help': case 'menu':          await helpCmd(sock, chatId, message); break;
            case 'ping':                       await pingCmd(sock, chatId, message); break;
            case 'alive':                      await aliveCmd(sock, chatId, message); break;
            case 'uptime':                     await uptimeCmd(sock, chatId, message); break;
            case 'owner':                      await ownerCmd(sock, chatId, message); break;
            case 'runtime': case 'sysinfo':    await runtimeCmd(sock, chatId, message); break;
            case 'session':                    await sessionCmd(sock, chatId, message); break;
            // MEDIA
            case 'sticker': case 's':          await stickerCmd(sock, chatId, message); break;
            case 'steal':                      await stealCmd(sock, chatId, message, args); break;
            case 'toimg':                      await toimgCmd(sock, chatId, message); break;
            case 'play':                       await playCmd(sock, chatId, message, args); break;
            case 'tts':                        await ttsCmd(sock, chatId, message, args); break;
            case 'vv': case 'viewonce':        await vvCmd(sock, chatId, message); break;
            case 'getdp': case 'dp':           await getDpCmd(sock, chatId, message); break;
            case 'savestatus':                 await saveStatusCmd(sock, chatId, message); break;
            case 'tomp3':                      await tomp3Cmd(sock, chatId, message); break;
            case 'tiktok':                     await tiktokCmd(sock, chatId, message, args); break;
            // AI & TOOLS
            case 'ai': case 'ask': case 'gpt': await aiCmd(sock, chatId, message, args); break;
            case 'weather':                    await weatherCmd(sock, chatId, message, args); break;
            case 'wiki': case 'wikipedia':     await wikiCmd(sock, chatId, message, args); break;
            case 'news':                       await newsCmd(sock, chatId, message, args); break;
            case 'tr': case 'translate':       await trCmd(sock, chatId, message, args); break;
            case 'calc': case 'math':          await calcCmd(sock, chatId, message, args); break;
            case 'define': case 'dict':        await defineCmd(sock, chatId, message, args); break;
            case 'qr': case 'qrcode':          await qrCmd(sock, chatId, message, args); break;
            case 'currency': case 'convert':   await currencyCmd(sock, chatId, message, args); break;
            case 'remind':                     await remindCmd(sock, chatId, message, args); break;
            case 'time':                       await timeCmd(sock, chatId, message, args); break;
            case 'encode':                     await encodeCmd(sock, chatId, message, args); break;
            case 'decode':                     await decodeCmd(sock, chatId, message, args); break;
            case 'upper': case 'uppercase':    await upperCmd(sock, chatId, message, args); break;
            case 'password': case 'pass':      await passwordCmd(sock, chatId, message, args); break;
            // FUN
            case 'joke': case 'jokes':         await jokeCmd(sock, chatId, message); break;
            case 'fact':                       await factCmd(sock, chatId, message); break;
            case 'quote':                      await quoteCmd(sock, chatId, message); break;
            case '8ball':                      await eightballCmd(sock, chatId, message, args); break;
            case 'dice': case 'roll':          await diceCmd(sock, chatId, message, args); break;
            case 'roast':                      await roastCmd(sock, chatId, message); break;
            case 'love':                       await loveCmd(sock, chatId, message, args); break;
            case 'zodiac':                     await zodiacCmd(sock, chatId, message, args); break;
            case 'poll':                       await pollCmd(sock, chatId, message, args); break;
            case 'tictactoe': case 'ttt':      await tttCmd(sock, chatId, message, args); break;
            case 'notes':                      await notesCmd(sock, chatId, message, args); break;
            case 'afk':                        await afkCommand(sock, chatId, message, args); break;
            // GROUP ADMIN
            case 'kick': case 'remove':        await kickCmd(sock, chatId, message); break;
            case 'kickall':                    await kickallCmd(sock, chatId, message); break;
            case 'promote':                    await promoteCmd(sock, chatId, message); break;
            case 'demote':                     await demoteCmd(sock, chatId, message); break;
            case 'mute':                       await muteCmd(sock, chatId, message); break;
            case 'unmute':                     await unmuteCmd(sock, chatId, message); break;
            case 'lock':                       await lockCmd(sock, chatId, message); break;
            case 'unlock':                     await unlockCmd(sock, chatId, message); break;
            case 'warn':                       await warnCmd(sock, chatId, message); break;
            case 'warnings': case 'warnlist':  await warningsCmd(sock, chatId, message); break;
            case 'clearwarn': case 'resetwarn':await clearwarnCmd(sock, chatId, message); break;
            case 'del': case 'delete':         await delCmd(sock, chatId, message); break;
            case 'tagall': case 'everyone':    await tagallCmd(sock, chatId, message, args); break;
            case 'hidetag': case 'ht':         await hidetagCmd(sock, chatId, message, args); break;
            case 'groupinfo': case 'ginfo':    await groupinfoCmd(sock, chatId, message); break;
            case 'admins': case 'staff':       await adminsCmd(sock, chatId, message); break;
            case 'topmembers': case 'ranking': await topMembersCmd(sock, chatId, message); break;
            case 'setname':                    await setnameCmd(sock, chatId, message, args); break;
            case 'getlink': case 'invitelink': await getlinkCmd(sock, chatId, message); break;
            case 'resetlink': case 'revoke':   await resetlinkCmd(sock, chatId, message); break;
            case 'antilink':                   await antilinkCommand(sock, chatId, message, args); break;
            case 'antibadword': case 'abw':    await antibadwordCommand(sock, chatId, message, args); break;
            case 'antispam':                   await antispamCommand(sock, chatId, message, args); break;
            case 'welcome':                    await welcomeCommand(sock, chatId, message, args); break;
            case 'goodbye': case 'bye':        await goodbyeCommand(sock, chatId, message, args); break;
            case 'chatbot': case 'cb':         await chatbotCommand(sock, chatId, message, args); break;
            case 'add':                        await addCmd(sock, chatId, message, args); break;
            // OWNER
            case 'mode':                       await modeCommand(sock, chatId, message, args); break;
            case 'ban':                        await banCmd(sock, chatId, message); break;
            case 'unban':                      await unbanCmd(sock, chatId, message); break;
            case 'bc': case 'broadcast':       await bcCommand(sock, chatId, message, args); break;
            case 'autoreply': case 'ar':       await autoReplyCommand(sock, chatId, message, args); break;
            case 'alwaysonline': case 'ao':    await alwaysOnlineCommand(sock, chatId, message, args); break;
            case 'grouplist': case 'groups':   await grouplistCmd(sock, chatId, message); break;
            case 'leave':                      await leaveCmd(sock, chatId, message); break;
            case 'block':                      await blockCmd(sock, chatId, message); break;
            case 'unblock':                    await unblockCmd(sock, chatId, message); break;
            case 'dm':                         await dmCmd(sock, chatId, message, args); break;
            // PROTECTION / SETTINGS
            case 'anticall':                   await anticallCmd.anticallCommand(sock, chatId, message, args); break;
            case 'antidelete':                 await antideleteCmd(sock, chatId, message, args); break;
            case 'antiviewonce':               await antivoCmd(sock, chatId, message, args); break;
            case 'autoreact':                  await autoreactCmd(sock, chatId, message, args); break;
            case 'autoread':                   await autoreadCmd(sock, chatId, message, args); break;
            case 'autosavestatus':             await autosaveCmd(sock, chatId, message, args); break;
            default: break;
        }
    } catch (e) { console.error('handleMessages error:', e.message); }
}

async function handleGroupParticipantUpdate(sock, update) {
    try {
        const { id, participants, action } = update;
        if (!id.endsWith('@g.us')) return;
        if (action === 'add')    await handleJoin(sock, id, participants);
        if (action === 'remove') await handleLeave(sock, id, participants);
    } catch (e) { console.error('group update error:', e.message); }
}

module.exports = { handleMessages, handleGroupParticipantUpdate };
