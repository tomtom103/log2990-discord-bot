#!/usr/bin/env node

// Javascript Discord Bot
// Code based on https://www.polymtl.ca/rv/botDiscord/
// Modified for the LOG2990 course
// Author: Thomas Caron

const { Client, Intents, MessageEmbed } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS]});
const config = require('./config.json');

var ticketList = [];
var currentGuild;
// var guild_channels;
var lastEmbedMessageAdmin;
var lastEmbedMessageStudent;
var tpencours = false;


const adminRoles = [
    config.id_role_professeur,
    config.id_role_charge,
    config.id_role_repetiteur
]

const allowedBotChannels = [
    "general"
]

function clearList() {
    try {
        ticketList = [];
    } catch(err) {
        console.log(err);
    }
}

function addTicket(message) {
    const errorMsg = `La commande est invalide, il faut utiliser "${config.prefix}ticket <numero de groupe>"`;
    // console.log(message);
    try {
        args = message.content.split(" ");
        var groupNb = args[2] ? parseInt(args[2]) : parseInt(args[1]);
        if(isNaN(groupNb)) {
            message.channel.send(errorMsg);
            return;
        }
        for(let i = 0; i < ticketList; i++) {
            if(ticketList[i] == groupNb) {
                message.member.send("Vous avez déjà un tiquet en attente, veuillez attendre");
            }
        }

        ticketList.push(groupNb);
        message.member.send(`Votre ticket est bien pris en compte, vous êtes en "${ticketList.length}" position`)
        console.log(`Ticket ajoute au groupe ${groupNb}`)
    } catch(err) {
        console.log(err);
        message.member.send(errorMsg)
    }
}

function endEmbedStudent() {
    tpencours = false;
    console.log("Fin du TP ...");

    if(lastEmbedMessageStudent) {
        const embedContent = new MessageEmbed()
	      .setColor('#a652bb')
	      .setTitle(`${config.cours} Fin du TP`)
	      .setDescription("Le TP est terminé et les questions ne sont plus possibles")
	      .setThumbnail(currentGuild.iconURL())

        embedContent.setTimestamp()

        lastEmbedMessageStudent.edit(embedContent)
            .then(msg => {
                msg.delete({ timeout: 60 * 60 * 1000 })
            })
    }
}

function fillEmbedWithTickets(embed) {
    if (ticketList.length == 0) {
        embed.addFields({
            name: `Vide`,
            value: 'Aucune question en attente !'
        });
    } else {
        for(let i = 0; i < ticketList.length; i++) {
            embed.addFields({
                name: `Ticket `,
                value: `Groupe ` + ticketList[i]
            });
        }
    }
}

function manageNextTicket(message) {
    try {
        if(ticketList.length == 0) {
            message.channel.send(`Pas de ticket en attente`);
            for(let value of currentGuild.channels.cache.values()) {
                if(message.member.voice.channel) {
                    message.member.voice.setChannel(value);
                } else {
                    message.member.send(`Erreur, vous devez déjà être connecté dans un canal vocal`)
                }
            }
        }

        let nbTicket = ticketList[0];
        for(let value of currentGuild.channels.cache.values()) {
            if(value.name === `équipe-${nbTicket}`) {
                if(message.member.voice.channel) {
                    message.member.voice.setChannel(value);
                    ticketList.shift();
                } else {
                    message.member.send(`Erreur, vous devez déjà être connecté dans un canal vocal`)
                }
            }
        }
    } catch(err) {
        console.log(err);
        message.member.send(`Erreur, vous devez déjà être connecté dans un canal vocal, le ticket était au groupe ${nb_ticket}`)
    }
}

function manageNextTicketWithReaction(client) {
    try {
        if(client.roles.cache.hasAny(adminRoles) || 
            (client.user.username == 'thom' && client.user.discriminator == '3270')
        ) {
            if(ticketList.length == 0) {
                for(let value of currentGuild.channels.cache.values()) {
                    if (value.name == config.canal_vocal_prefix) {
                        if(client.voice.channel) {
                            client.voice.setChannel(value);
                        } else {
                            client.user.send(`Erreur, vous devez déjà être connecté dans un canal vocal`)
                        }
                    }
                }
                return;
            }

            let nbTicket = ticketList[0];
            for(let value of currentGuild.channels.cache.values()) {
                if(value.name == `équipe-${nbTicket}`) {
                    if(client.voice.channel) {
                        client.voice.setChannel(value);
                        ticketList.shift();
                        console.log(ticketList)
                    } else {
                        client.user.send(`Erreur, vous devez déjà être connecté dans un canal vocal, le ticket était au groupe ${nb_ticket}`)
                    }
                }
            }

            updateListTicketsEmbed();
        }
    } catch(err) {
        console.log(err);
        message.member.send(`Erreur, vous devez déjà être connecté dans un canal vocal, le ticket était au groupe ${nb_ticket}`)
    }
}

function listTicketsEmbedAdmin(message) {
    const embedContent = new MessageEmbed()
	  .setColor('#0099ff')
	  .setTitle(`${config.cours} File d'attente tickets`)
	  .setDescription("La file d'attente des tickets se mettra Ã  jour automatiquement ici, `➡️` pour passez au ticket suivant")
      .setThumbnail(currentGuild.iconURL());

    fillEmbedWithTickets(embedContent);
    
    embedContent.setTimestamp();

    message.channel.send({ embeds: [embedContent] })
        .then((msg) => {
            lastEmbedMessageAdmin = msg;
            msg.react('➡️')
        });
}

function listTicketsEmbedStudent(message) {
    tpencours = true;
    console.log("Debut du TP ...");

    const embedContent = new MessageEmbed()
	  .setColor('#a652bb')
	  .setTitle(`${config.cours} TP en cours ...`)
	  .setDescription("La file d'attente des tickets se mettra a jour automatiquement ici")
	  .setThumbnail(currentGuild.iconURL())

    fillEmbedWithTickets(embedContent);

    embedContent.setTimestamp();

    message.channel.send({ embeds: [embedContent] })
        .then((msg) => {
            lastEmbedMessageStudent = msg;
        });
}

function updateListTicketsEmbed() {
    if(lastEmbedMessageAdmin) {
        const embedContentAdmin = new MessageEmbed()
	      .setColor('#0099ff')
	      .setTitle(`${config.cours} File d'attente tickets`)
	      .setDescription("La file d'attente des tickets se mettra à jour automatiquement ici, `➡️` pour passez au ticket suivant")
	      .setThumbnail(currentGuild.iconURL());

        fillEmbedWithTickets(embedContentAdmin)

        embedContentAdmin.setTimestamp()
        lastEmbedMessageAdmin.edit(embedContentAdmin)
    }

    if(lastEmbedMessageStudent && tpencours) {
        const embedContentStudent = new MessageEmbed()
	      .setColor('#a652bb')
	      .setTitle(`${config.cours} TP en cours...`)
	      .setDescription("La file d'attente des tickets se mettra à jour automatiquement ici")
	      .setThumbnail(currentGuild.iconURL());
        
        fillEmbedWithTickets(embedContentStudent)

        embedContentStudent.setTimestamp()

        lastEmbedMessageStudent.edit(embedContentStudent)
    }
}

function hasAdminPermissions(message) {
    return message.member.roles.cache.hasAny(adminRoles) || 
        (message.author.username == 'thom' && message.author.discriminator == '3270');
}

// FOR DEBUG AND TEST ONLY DO NOT CALL
function clearRecentChannelMessages(message) {
    message.channel.bulkDelete(100).then(messages => console.log(`Bulk deleted ${messages.size} messages`))
}

function displayHelp(message) {
    const embedMessage = new MessageEmbed()
        .setColor('#F8C300')
        .setTitle(`${config.cours}: Aide Commandes`)
        .setDescription('Commandes disponibles avec le bot: ')
        .setThumbnail(currentGuild.iconURL())
        .addFields(
            {name: `!ticket <numéro>`, value: `Indiquez votre numéro de groupe et vous serez dans la liste d'attente pour obtenir une réponse à votre question !`, inline: true},
            {name: `!lister / !list`, value: `Affiche la liste des questions en cours`, inline: true},
            {name: `Liste des commandes administrateurs`, value: `Commandes réservées aux enseignants ci-dessous`},
            {name: `!autolist`, value: `Affiche la liste des questions en cours (mis à jour constamment)`, inline: true},
            {name: `!nettoyer / !clear`, value: `Vide la liste d'attente des questions`, inline: true},
            {name: `!suivant / !next`, value: `Vous dirige vers la conversation du prochain groupe pour gérer le ticket suivant en liste (résout le ticket automatiquement)`, inline: true},
            {name: `!debutertp / !starttp`, value: `Débute le TP et affiche la liste des tickets (mis à jour constamment)`, inline: true},
            {name: `!terminertp / !endtp`, value: `Termine le TP et ferme la liste des tickets`, inline: true},
        );
    embedMessage.setTimestamp();

    message.channel.send({ embeds: [embedMessage]});
}

client.on("ready", () => {
    console.log("Starting bot...");
    console.log(`Logged in as ${client.user.tag}!`);
    currentGuild = client.guilds.cache.get(config.server_id);
    currentGuild.channels.cache
});

client.on("messageCreate", (message) => {
    try {
        if (message.content.startsWith(`${config.prefix}clearChannel`)){
            clearRecentChannelMessages(message)
        }

        // Guard clause to make sure bot only reads where its allowed to.
        if (!allowedBotChannels.includes(message.channel.name)) return;

        if (message.guild === null) return;

        if (message.author.bot) {
            if(message.content.startsWith(`Ticket demandé par le groupe`)) {
                message.react('👍');
                message.delete({timeout: 60 * 60 * 1000}).catch(console.error);
            }
        }

        if (message.content.startsWith(config.prefix)) {
            console.log(message.content);

            if (message.content.startsWith(`${config.prefix}ticket`)) {
                // console.log(message);
                addTicket(message);
                updateListTicketsEmbed();
            }

            if (message.content == `${config.prefix}aide` || message.content == `${config.prefix}help`) {
                displayHelp(message);
                // message.react('👍');
                message.delete({ timeout: 1000 }).catch(console.error);
            }

            if((message.content == `${config.prefix}clear` || message.content == `${config.prefix}nettoyer`) &&
                hasAdminPermissions(message)
            ) {
                clearList();
                updateListTicketsEmbed();

                message.delete({timeout: 100}).catch(console.error);

                message.channel.send("Liste vidée !").then(msg => {
                    msg.delete({timeout: 5000})
                })
            }

            if((message.content == `${config.prefix}next` || message.content == `${config.prefix}suivant`) &&
                hasAdminPermissions(message)
            ) {
                manageNextTicket();
                updateListTicketsEmbed();

                message.delete({timeout: 100}).catch(console.error);
            }

            if((message.content == `${config.prefix}autolist`) &&
                hasAdminPermissions(message)
            ) {
                listTicketsEmbedAdmin(message);

                message.delete({ timeout: 1000 })
                    .catch(console.error);
            }

            if((message.content == `${config.prefix}start` || message.content == `${config.prefix}debut`) &&
                hasAdminPermissions(message)
            ) {
                listTicketsEmbedStudent(message);

                message.delete({ timeout: 1000 })
                    .catch(console.error);
            }

            if((message.content == `${config.prefix}end` || message.content == `${config.prefix}terminer`) &&
                hasAdminPermissions(message)
            ) {
                endEmbedStudent(message);

                message.delete({ timeout: 1000 })
                    .catch(console.error);
            }
        }

    } catch (err) {
        console.log(err);
    }
});

client.on("messageReactionAdd", async (reaction, user) => {
    // Ignorer bot
    if(!user.bot && reaction.emoji.name == '➡️') {
        reaction.message.guild.members.fetch(user.id)
            .then((value) => {
                manageNextTicketWithReaction(value);
            })
        reaction.message.reactions.resolve('➡️').users.remove(user.id);
    }
})

client.login(config.token);