// index.js - Roblox Account Generator with CapSolver
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const crypto = require('crypto');
const { CapSolver, FunCaptchaTaskProxyLess } = require('@captcha-libs/capsolver');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CAPSOLVER_API_KEY = process.env.CAPSOLVER_API_KEY;  // Set this in your host's env variables

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages
    ]
});

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// Helper function to solve Roblox FunCaptcha
async function solveRobloxCaptcha() {
    const capsolverClient = new CapSolver({ clientKey: CAPSOLVER_API_KEY });
    
    const task = new FunCaptchaTaskProxyLess({
        websiteURL: 'https://www.roblox.com/signup',
        websitePublicKey: '476068BF-9607-4799-B53D-966BE98E2B81'  // Roblox's public FunCaptcha key
    });
    
    const solution = await capsolverClient.solve(task);
    return solution.gRecaptchaResponse;  // This is the FunCaptcha token
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!gen')) return;

    const args = message.content.split(' ');
    let amount = parseInt(args[1]) || 1;
    amount = Math.min(amount, 3);  // Limit to 3 to avoid rate limits

    await message.reply(`🤖 Generating ${amount} Roblox account(s)... This may take up to 30 seconds each.`);

    for (let i = 0; i < amount; i++) {
        try {
            // 1. Generate random credentials
            const username = `User_${crypto.randomBytes(4).toString('hex')}`;
            const password = crypto.randomBytes(8).toString('hex');
            const year = Math.floor(Math.random() * (2010 - 1990 + 1) + 1990);
            const month = Math.floor(Math.random() * 12) + 1;
            const day = Math.floor(Math.random() * 28) + 1;
            const birthdate = `${year}-${month}-${day}`;

            // 2. Solve the FunCaptcha
            console.log(`Solving captcha for account ${i+1}...`);
            const captchaToken = await solveRobloxCaptcha();
            
            // 3. Get CSRF token (required by Roblox API)
            const csrfRes = await axios.post('https://auth.roblox.com/v2/logout', {}, {
                headers: { 'Content-Type': 'application/json' }
            });
            const csrfToken = csrfRes.headers['x-csrf-token'];

            // 4. Submit signup with captcha token
            const signupRes = await axios.post('https://auth.roblox.com/v2/signup', {
                username: username,
                password: password,
                birthdate: birthdate,
                isTosAccepted: true,
                captchaToken: captchaToken   // The solved token goes here
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken
                }
            });

            if (signupRes.data && signupRes.data.user) {
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Account Generated')
                    .addFields(
                        { name: 'Username', value: username, inline: true },
                        { name: 'Password', value: password, inline: true },
                        { name: 'Birthdate', value: birthdate, inline: true }
                    )
                    .setTimestamp();
                await message.channel.send({ embeds: [embed] });
            } else {
                const errorMsg = signupRes.data?.errors?.[0]?.message || 'Unknown error';
                await message.channel.send(`❌ Account ${i+1} failed: ${errorMsg}`);
            }
        } catch (error) {
            console.error(error);
            const detail = error.response?.data?.errors?.[0]?.message || error.message;
            await message.channel.send(`❌ Account ${i+1} error: ${detail}`);
        }

        // Wait 3 seconds between attempts to avoid rate limiting
        await new Promise(r => setTimeout(r, 3000));
    }
});

client.login(BOT_TOKEN);
