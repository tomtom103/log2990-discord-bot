#!/usr/bin/env node

// Javascript Discord Bot
// Code based on https://www.polymtl.ca/rv/botDiscord/
// Modified for the LOG2990 course
// Author: Thomas Caron

// Small express server used to host the bot on repl.it
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => res.send('HelloWorld!'));

app.listen(port, () => console.log('Listening on http://localhost:3000/'));

// Bot code
const path = require('path');
const { Collection, Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS]});
const isProd = process.env.NODE_ENV === 'production';
require('dotenv').config({
    path: path.join(__dirname, isProd ? '.env' : '.env.dev')
});
const { log, error } = require('./util/logger');
const ON_DEATH = require('death');

const {
    DISCORD_TOKEN,
    PREFIX
} = process.env;

const {
    helpCommand,
    ticketCommand,
    manageNextTicket,
    manageNextTicketCommand,
    startSessionCommand,
    autoListCommand,
    endEmbedStudent,
    clearChannelCommand,
    pongCommand
} = require('./commands')

/**
 * Scope where the bot is allowed to read
 */
const allowedBotChannelIds = 
    isProd ? [
        "927754929811128340",
        "928368648958119936"
    ] : [
        "927644378632171543",
    ];

client.on("ready", () => {
    log("Starting bot...");
    log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", (message) => {
    try {
        if ((!allowedBotChannelIds.includes(message.channel.id)) ||
            (message.guild === null) || 
            (!message.content.startsWith(PREFIX))) return;
            
        log(`User ${message.author.username} wrote: ${message.content}`);

        // Remove prefix + split command into args
        const args = message.content.substring(1).split(" ");

        const commands = new Collection();

        commands.set('help', (message) => helpCommand(message));
        commands.set('ticket', (message) => ticketCommand(message));
        commands.set('next', (message) => manageNextTicketCommand(message));
        commands.set('start', (message) => startSessionCommand(message));
        commands.set('clear', (message) => clearChannelCommand(message));
        commands.set('ping', (message) => pongCommand(message));
        commands.set('listChannels', (message) => listChannelsCommand(message));
        commands.set('autolist', (message) => autoListCommand(message));
        commands.set('end', (message) => endEmbedStudent(message));

        const command = commands.get(args[0]);
        if(command !== undefined) {
            command(message);
        }
    } catch (err) {
        error(err);
    }
});

client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot || !allowedBotChannelIds.includes(reaction.message.channel.id)) return;
    if(reaction.emoji.name == '➡️') {
        reaction.message.guild.members.fetch(user.id).then((member) => {
            manageNextTicket(member);
        });
        reaction.message.reactions.resolve('➡️').users.remove(user.id);
    }
})

client.login(DISCORD_TOKEN);

ON_DEATH((signal, err) => {
    log('KILLED, cleaning up')
    // Clean up code...

    process.exit()
});