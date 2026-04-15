// index.js - Roblox Account Generator with CapSolver
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const crypto = require('crypto');
const { CapSolver, FunCaptchaTaskProxyLess } = require('@captcha-libs/capsolver');
const express = require('express');

// Environment variables (set these in Render)
const BOT_TOKEN = process.env.BOT_TOKEN;
const CAPSOLVER_API_KEY = process.env.CAPSOLVER_API_KEY;

// Create Discord client with REQUIRED intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent  // ABSOLUTELY NECESSARY for reading !gen
    ]
});

// Helper: Solve Roblox FunCaptcha
async function solveRobloxCaptcha() {
    const capsolverClient = new CapSolver({ clientKey: CAPSOLVER_API_KEY });
    const task = new FunCaptchaTaskProxyLess({
        websiteURL: 'https://www.roblox.com/signup',
        websitePublicKey: '476068BF-9607-4799-B53D-966BE98E2B81'
    });
    const solution = await capsolverClient.solve(task);
    return solution.gRecaptchaResponse;
}

// When bot is ready
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// Listen for messages
client.on('messageCreate', async (message) => {
    // Ignore bots and empty messages
    if (message.author.bot) return;
    
    // PING TEST COMMAND (use this first to verify bot works)
    if (message.content === '!ping') {
        await message.reply('🏓 Pong! Bot is alive and listening.');
        return;
    }
    
    // MAIN GENERATION COMMAND
    if (!message.content.startsWith('!gen')) return;
    
    const args = message.content.split(' ');
    let amount = parseInt(args[1]) || 1;
    amount = Math.min(amount, 3);
    
    await message.reply(`🤖 Generating ${amount} Roblox account(s)... This can take up to 30 seconds each.`);
    
    for (let i = 0; i < amount; i++) {
        try {
            // Generate random credentials
            const username = `User_${crypto.randomBytes(4).toString('hex')}`;
            const password = crypto.randomBytes(8).toString('hex');
            const year = Math.floor(Math.random() * (2010 - 1990 + 1) + 1990);
            const month = Math.floor(Math.random() * 12) + 1;
            const day = Math.floor(Math.random() * 28) + 1;
            const birthdate = `${year}-${month}-${day}`;
            
            // Solve captcha
            console.log(`Solving captcha for account ${i+1}...`);
            const captchaToken = await solveRobloxCaptcha();
            
            // Get CSRF token
            const csrfRes = await axios.post('https://auth.roblox.com/v2/logout', {}, {
                headers: { 'Content-Type': 'application/json' }
            });
            const csrfToken = csrfRes.headers['x-csrf-token'];
            
            // Submit signup
            const signupRes = await axios.post('https://auth.roblox.com/v2/signup', {
                username: username,
                password: password,
                birthdate: birthdate,
                isTosAccepted: true,
                captchaToken: captchaToken
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
                const errMsg = signupRes.data?.errors?.[0]?.message || 'Unknown error';
                await message.channel.send(`❌ Account ${i+1} failed: ${errMsg}`);
            }
        } catch (error) {
            console.error(error);
            const detail = error.response?.data?.errors?.[0]?.message || error.message;
            await message.channel.send(`❌ Account ${i+1} error: ${detail}`);
        }
        await new Promise(r => setTimeout(r, 3000));
    }
});

// Express server for Render (keeps the bot alive)
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(port, () => console.log(`✅ Web server on port ${port}`));

// Login to Discord
client.login(BOT_TOKEN);
