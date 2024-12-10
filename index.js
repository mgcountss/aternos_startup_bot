import dotenv from 'dotenv';
dotenv.config();
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { REST, Routes, Client, GatewayIntentBits } from 'discord.js';
puppeteer.use(StealthPlugin());
import fs from 'fs';
const username = process.env.aternos_username;
const password = process.env.aternos_password;
let browser;
let loggingIn = true;
let serverOnline = false;
let restarting = false;

const waitFor = (ms) => new Promise(r => setTimeout(r, ms));

const loginToAternos = async () => {
    loggingIn = true;
    browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-features=site-per-process'] });
    const page = await browser.newPage();

    if (fs.existsSync('cookies.json')) {
        const cookies = JSON.parse(fs.readFileSync('cookies.json'));
        await browser.setCookie(...cookies);
        loggingIn = false;
        return;
    }

    await page.goto('https://aternos.org/go/');

    await page.waitForSelector('.username');
    await page.click('.username');
    console.log(username, password);
    await page.keyboard.type(username);
    await page.click('.password');
    await page.keyboard.type(password);
    await waitFor(5000);
    await page.click('.login-button');
    await waitFor(5000);
    const cookies = await page.cookies();
    fs.writeFileSync('cookies.json', JSON.stringify(cookies));
    page.close();
    loggingIn = false;
}

const selectServer = async () => {
    const page = await browser.newPage();
    await page.goto('https://aternos.org/servers/');
    waitFor(5000);
    if (await page.$('.servercardlist')) {
        await page.click(`[title="${process.env.aternos_server_name}"]`);
        return page;
    } else {
        console.log('No servers found');
        page.close();
        fs.unlinkSync('cookies.json');
        loginToAternos();
        return;
    }
}

const startServer = async () => {
    try {
        const page = await selectServer();
        if (!page) {
            return false;
        }
        await waitFor(5000);
        await page.click('#start');
        await waitFor(5000);
        page.close();
        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
}

const stopServer = async () => {
    try {
        const page = await selectServer();
        if (!page) {
            return false;
        }
        await waitFor(5000);
        await page.click('#stop');
        await waitFor(5000);
        page.close();
        return true;
    } catch (e) {
        return false;
    }
}

const restartServer = async () => {
    try {
        const page = await selectServer();
        if (!page) {
            return false;
        }
        await waitFor(5000);
        await page.click('#restart');
        await waitFor(5000);
        page.close();
        return true;
    } catch (e) {
        return false;
    }
}

const addToWhitelist = async (playerName) => {
    try {
        const page = await selectServer();
        if (!page) {
            return false;
        }
        await waitFor(5000);
        await page.goto('https://aternos.org/players/whitelist');
        await waitFor(5000);
        await page.click('#list-input');
        await page.keyboard.type(playerName);
        await page.click('.btn.btn-small.btn-white');
        await waitFor(5000);
        page.close();
        return true;
    } catch (e) {
        return false;
    }
}

const removeFromWhiteList = async (playerName) => {
    try {
        const page = await selectServer();
        if (!page) {
            return false;
        }
        await waitFor(5000);
        await page.goto('https://aternos.org/players/whitelist');
        await waitFor(5000);
        const list = await page.$$('.list-name');
        for (let i = 0; i < list.length; i++) {
            const name = await (await list[i].getProperty('innerText')).jsonValue();
            if (name === playerName) {
                await page.click(`.list:nth-child(${i + 1}) .fas.fa-trash`);
                await waitFor(5000);
                page.close();
                return true;
            }
        }
        console.log('Player not found');
        page.close();
    } catch (e) {
        return false;
    }
}

const addToBanList = async (playerName) => {
    try {
        const page = await selectServer();
        if (!page) {
            return false;
        }
        await waitFor(5000);
        await page.goto('https://aternos.org/players/banned-players');
        await waitFor(5000);
        await page.click('#list-input');
        await page.keyboard.type(playerName);
        await page.click('.btn.btn-small.btn-white');
        await waitFor(5000);
        page.close();
        return true;
    } catch (e) {
        return false;
    }
}

const removeFromBanList = async (playerName) => {
    try {
        const page = await selectServer();
        if (!page) {
            return false;
        }
        await waitFor(5000);
        await page.goto('https://aternos.org/players/banned-players');
        await waitFor(5000);
        const list = await page.$$('.list-name');
        for (let i = 0; i < list.length; i++) {
            const name = await (await list[i].getProperty('innerText')).jsonValue();
            if (name === playerName) {
                await page.click(`.list:nth-child(${i + 1}) .fas.fa-trash`);
                await waitFor(5000);
                page.close();
                return true;
            }
        }
        console.log('Player not found');
        page.close();
        return false;
    } catch (e) {
        return false;
    }
}

const getStats = async () => {
    try {
        const page = await selectServer();
        if (!page) {
            return false;
        }
        await waitFor(5000);
        console.log('getting stats');
        const players = await (await page.$('.live-status-box-value.js-players')).getProperty('innerText');
        const ramPercent = await (await page.$('.live-status-box-value.js-ram')).getProperty('innerText');
        const ramTotal = await (await page.$('.live-status-box-label')).getProperty('innerText');
        const tps = await (await page.$('.live-status-box-value.js-tps')).getProperty('innerText');
        const ip = await (await page.$('#id')).getProperty('innerText');
        const version = await (await page.$('#version')).getProperty('innerText');
        const json = {
            players: await players.jsonValue(),
            ramPercent: await ramPercent.jsonValue(),
            ramTotal: await ramTotal.jsonValue(),
            tps: await tps.jsonValue(),
            ip: await ip.jsonValue(),
            version: await version.jsonValue()
        }
        console.log(json);
        page.close();
        return json;
    } catch (e) {
        return false;
    }
}

const commands = [
    {
        name: 'start',
        description: 'Start the server'
    },
    {
        name: 'stop',
        description: 'Stop the server'
    },
    {
        name: 'restart',
        description: 'Restart the server'
    },
    {
        name: 'whitelist',
        description: 'Add a player to the whitelist',
        options: [
            {
                name: 'player',
                description: 'The player to whitelist',
                type: 3,
                required: true
            }
        ]
    },
    {
        name: 'unwhitelist',
        description: 'Remove a player from the whitelist',
        options: [
            {
                name: 'player',
                description: 'The player to unwhitelist',
                type: 3,
                required: true
            }
        ]
    },
    {
        name: 'ban',
        description: 'Ban a player',
        options: [
            {
                name: 'player',
                description: 'The player to ban',
                type: 3,
                required: true
            }
        ]
    },
    {
        name: 'unban',
        description: 'Unban a player',
        options: [
            {
                name: 'player',
                description: 'The player to unban',
                type: 3,
                required: true
            }
        ]
    },
    {
        name: 'stats',
        description: 'Get server stats'
    }
]


const rest = new REST({ version: '10' }).setToken(process.env.discord_token);

try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(process.env.client_id), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
} catch (error) {
    console.error(error);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (loggingIn) return await interaction.reply('The bot is currently logging in, please try again later');
    if (restarting) return await interaction.reply('The server is currently restarting, please try again later');

    if (interaction.commandName === 'start') {
        if (serverOnline) return await interaction.reply('The server is already online');
        await interaction.reply('Starting server');
        const started = await startServer();
        if (started) {
            await interaction.editReply('Server started');
            serverOnline = true;
        } else {
            await interaction.editReply('Failed to start server');
        }
    } else if (interaction.commandName === 'stop') {
        if (!serverOnline) return await interaction.reply('The server is already offline');
        const stopped = await stopServer();
        if (stopped) {
            await interaction.reply('Server stopped');
            serverOnline = false;
        } else {
            await interaction.reply('Failed to stop server');
        }
    } else if (interaction.commandName === 'restart') {
        restarting = true;
        const restarted = await restartServer();
        restarting = false;
        if (restarted) {
            await interaction.reply('Server restarted');
        } else {
            await interaction.reply('Failed to restart server');
        }
    } else if (interaction.commandName === 'whitelist') {
        const playerName = interaction.options.getString('player');
        const added = await addToWhitelist(playerName);
        if (added) {
            await interaction.reply(`Added ${playerName} to the whitelist`);
        } else {
            await interaction.reply(`Failed to add ${playerName} to the whitelist`);
        }
    } else if (interaction.commandName === 'unwhitelist') {
        const playerName = interaction.options.getString('player');
        const removed = await removeFromWhiteList(playerName);
        if (removed) {
            await interaction.reply(`Removed ${playerName} from the whitelist`);
        } else {
            await interaction.reply(`Failed to remove ${playerName} from the whitelist`);
        }
    } else if (interaction.commandName === 'ban') {
        const playerName = interaction.options.getString('player');
        const added = await addToBanList(playerName);
        if (added) {
            await interaction.reply(`Banned ${playerName}`);
        } else {
            await interaction.reply(`Failed to ban ${playerName}`);
        }
    } else if (interaction.commandName === 'unban') {
        const playerName = interaction.options.getString('player');
        const removed = await removeFromBanList(playerName);
        if (removed) {
            await interaction.reply(`Unbanned ${playerName}`);
        } else {
            await interaction.reply(`Failed to unban ${playerName}`);
        }
    } else if (interaction.commandName === 'stats') {
        const stats = await getStats();
        if (stats) {
            await interaction.reply(`Players: ${stats.players}\nRAM: ${stats.ramPercent}/${stats.ramTotal}\nTPS: ${stats.tps}\nIP: ${stats.ip}\nVersion: ${stats.version}`);
        } else {
            await interaction.reply('Failed to get stats');
        }
    }
});

loginToAternos();
client.login(process.env.discord_token);