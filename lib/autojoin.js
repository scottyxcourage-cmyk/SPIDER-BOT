/**
 * spider — Auto Join Channel & Group
 * Uses multiple methods as fallback
 */

const CHANNEL_ID = '0029Vb61NmpLikg7gNFyV23w';
const CHANNEL_URL = `https://whatsapp.com/channel/${CHANNEL_ID}`;
const GROUP_CODE  = 'Hm6zBNNz93t6aZ2XjSgzu7';

async function autoJoinChannel(sock) {
    // Method 1: newsletterSubscribe (newer Baileys)
    try {
        if (typeof sock.newsletterSubscribe === 'function') {
            await sock.newsletterSubscribe(CHANNEL_URL);
            console.log('✅ Channel joined via newsletterSubscribe');
            return true;
        }
    } catch(e) { console.log('⚠️ newsletterSubscribe failed:', e.message); }

    // Method 2: followNewsletter
    try {
        if (typeof sock.followNewsletter === 'function') {
            await sock.followNewsletter(CHANNEL_ID);
            console.log('✅ Channel joined via followNewsletter');
            return true;
        }
    } catch(e) { console.log('⚠️ followNewsletter failed:', e.message); }

    // Method 3: Send channel link as a message to self (prompts user to follow)
    try {
        const botNum = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        await sock.sendMessage(botNum, {
            text: `📢 *Follow spider Channel!*\n\nStay updated with spider news, updates and tips:\n\n${CHANNEL_URL}\n\n_Tap the link to follow_ ☝️`
        });
        console.log('✅ Channel link sent to user DM');
        return true;
    } catch(e) { console.log('⚠️ DM method failed:', e.message); }

    return false;
}

async function autoJoinGroup(sock) {
    try {
        await sock.groupAcceptInvite(GROUP_CODE);
        console.log('✅ Group joined');
        return true;
    } catch(e) { console.log('⚠️ Group join failed:', e.message); }
    return false;
}

module.exports = { autoJoinChannel, autoJoinGroup, CHANNEL_URL, GROUP_CODE };
