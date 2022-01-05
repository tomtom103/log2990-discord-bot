#!/usr/bin/env node

const { MessageEmbed } = require('discord.js');
const { log, error } = require('./util/logger');
const { PriorityQueue } = require('./util/priorityqueue');

const {
    ID_ROLE_PROFESSEUR,
    ID_ROLE_CHARGE,
    ID_ROLE_REPETITEUR,
    CLASS,
    PREFIX
} = process.env;

const adminRoles = [
    ID_ROLE_PROFESSEUR,
    ID_ROLE_CHARGE,
    ID_ROLE_REPETITEUR,
];

const defaultVoiceChannelId = isProd ? "926959608596164713" : "926959608596164713"
const voiceChannelPrefix = "Salon ";

const queue = new PriorityQueue();
var sessionStarted = false;

/**
 * We need to keep embedMessages in memory
 * to update them whenever we get a new ticket.
 */
var lastEmbedMessageAdmin;
var lastEmbedMessageStudent;

/**
 * 
 * @param {import('discord.js').GuildMember} member 
 */
function hasAdminPermissions(member) {
    return member.roles.cache.some((role) => adminRoles.includes(role.id));
}

/**
 * 
 * @param {import('discord.js').Message<boolean>} message 
 */
function helpCommand(message) {
    const embedMessage = new MessageEmbed()
        .setColor('#F8C300')
        .setTitle(`${CLASS}: Aide Commandes`)
        .setDescription('Commandes disponibles avec le bot: ')
        .setThumbnail(currentGuild.iconURL())
        .addFields(
            {name: `!ticket <numéro>`, value: `Indiquez votre numéro de groupe et vous serez dans la liste d'attente pour obtenir une réponse à votre question !`, inline: true},
            {name: `!list`, value: `Affiche la liste des questions en cours`, inline: true},
            {name: `Liste des commandes administrateurs`, value: `Commandes réservées aux enseignants ci-dessous`},
            {name: `!autolist`, value: `Affiche la liste des questions en cours (mis à jour constamment)`, inline: true},
            {name: `!clear`, value: `Vide la liste d'attente des questions`, inline: true},
            {name: `!next`, value: `Vous dirige vers la conversation du prochain groupe pour gérer le ticket suivant en liste (résout le ticket automatiquement)`, inline: true},
            {name: `!start`, value: `Débute le TP et affiche la liste des tickets (mis à jour constamment)`, inline: true},
            {name: `!end`, value: `Termine le TP et ferme la liste des tickets`, inline: true},
        );
    embedMessage.setTimestamp();

    message.channel.send({ embeds: [embedMessage]}).then((msg) => {
        setTimeout(() => msg.delete().catch(error), 30 * 60 * 1000);
    });

    setTimeout(() => message.delete().catch(error), 1000);
}

/**
 * 
 * @param {import('discord.js').Message<boolean>} message 
 */
function ticketCommand(message) {
    const errorMsg = `La commande est invalide, il faut utiliser "${PREFIX}ticket <numero de groupe>"`;

    try {
        if (!sessionStarted) {
            setTimeout(() => message.delete().catch(error), 1000);

            message.channel.send("Aucune session est active").then((msg) => {
                setTimeout(() => msg.delete().catch(error), 10 * 1000)
            });

            return;
        }

        const args = message.content.split(" ");
        const groupNb = args[2] ? parseInt(args[2]) : parseInt(args[1]);
        if (isNaN(groupNb)) {
            message.channel.send(errorMsg);
            return;
        }
        if (queue.contains(groupNb)) {
            message.member.send("Vous avez déjà un tiquet en attente, veuillez attendre");
            return;
        }

        queue.push(groupNb);
        message.member.send(`Votre ticket est bien pris en compte, vous êtes en "${ticketList.length}" position`);
        log(`Ticket ajouté au groupe ${groupNb}`);
        updateListTicketsEmbed(message.member);
        setTimeout(() => message.delete().catch(log), 1000);

    } catch (err) {
        error(err);
        message.member.send(errorMsg);
    }
}

/**
 * 
 * @param {import('discord.js').GuildMember} member 
 */
function manageNextTicket(member) {
    if (queue.isEmpty()) {
        if (member.voice.channel) {
            // TODO: Find how to get channel id
            const voice = member.guild.channels.fetch(defaultVoiceChannelId)
            member.voice.setChannel(voice)
        }

        return;
    }

    let nbTicket = queue.pop();
    if (member.voice.channel) {
        for (let value of member.guild.channels.cache.values()) {
            if (value.name === `${voiceChannelPrefix}${nbTicket}`) {
                member.voice.setChannel(value);
                log(`Joined channel: ${value.name}, ${ticketList.length} tickets left`);
                break;
            }
        }
    } else {
        member.user.send(`La prochaine équipe est: ${nbTicket}`);
        log(`User ${member.user.username} received ticket ${nbTicket}`);
    }
}

/**
 * 
 * @param {import('discord.js').Message<boolean>} message 
 */
function manageNextTicketCommand(message) {
    try {
        if (!hasAdminPermissions(message.member)) return;

        if (!sessionStarted) {
            setTimeout(() => message.delete().catch(error), 1000)

            message.channel.send("Aucune session est active").then((msg) => {
                setTimeout(() => msg.delete().catch(error), 10 * 1000)
            });

            return;
        }

        if (queue.isEmpty()) {
            // Display message and delete it after 10 seconds
            message.channel.send(`Pas de ticket en attente`).then((msg) => {
                setTimeout(() => msg.delete().catch(error), 10 * 1000)
            });

            message.delete().catch(error);

            return;
        }

        manageNextTicket(message.member);

        setTimeout(() => message.delete().catch(error), 1000);
    } catch (err) {
        error(err)
    }
}

/**
 * 
 * @param {import('discord.js').Message<boolean>} message 
 */
function startSessionCommand(message) {
    if (!hasAdminPermissions(message.member)) return;

    listTicketsEmbedStudent(message);

    message.delete().catch(error);
}

/**
 * 
 * @param {import('discord.js').Message<boolean>} message 
 */
function autoListCommand(message) {
    if (!hasAdminPermissions(message.member)) return;

    try {
        if (!sessionStarted) {
            setTimeout(() => message.delete().catch(error), 1000)

            message.channel.send("Aucune session est active").then((msg) => {
                setTimeout(() => msg.delete().catch(error), 10 * 1000)
            });

            return;
        }

        listTicketsEmbedAdmin(message);

        message.delete().catch(error);
    } catch (err) {
        error(err);
    }
}

/**
 * 
 * @returns 
 */
function endEmbedStudent() {
    if (!hasAdminPermissions(message.member)) return;

    sessionStarted = false;
    log('Fin du TP ...');

    if(lastEmbedMessageStudent) {
        const embedContent = new MessageEmbed()
	      .setColor('#a652bb')
	      .setTitle(`${CLASS} Fin du TP`)
	      .setDescription("Le TP est terminé et les questions ne sont plus possibles")
	      .setThumbnail(currentGuild.iconURL())

        embedContent.setTimestamp()

        lastEmbedMessageStudent.edit({ embeds: [embedContent] })
            .then(msg => {
                setTimeout(() => msg.delete().catch(error), 60 * 60 * 1000);
            })
    }

    if(lastEmbedMessageAdmin) {
        const embedContent = new MessageEmbed()
	      .setColor('#0099ff')
	      .setTitle(`${CLASS} Fin du TP`)
	      .setDescription("Ce message va s'effacer automatiquement au bout de 1h")
	      .setThumbnail(currentGuild.iconURL())

        embedContent.setTimestamp()

        lastEmbedMessageAdmin.edit({ embeds: [embedContent] })
            .then(msg => {
                setTimeout(() => msg.delete().catch(error), 60 * 60 * 1000);
            })
    }
}

/**
 * 
 * @param {import('discord.js').GuildMember} member 
 */
function updateListTicketsEmbed(member) {
    if (lastEmbedMessageAdmin) {
        const embedContentAdmin = new MessageEmbed()
	      .setColor('#0099ff')
	      .setTitle(`${CLASS} File d'attente tickets`)
	      .setDescription("La file d'attente des tickets se mettra à jour automatiquement ici, `➡️` pour passez au ticket suivant")
	      .setThumbnail(member.guild.iconURL());

        fillEmbedWithTickets(embedContentAdmin)

        embedContentAdmin.setTimestamp()
        lastEmbedMessageAdmin.edit({ embeds: [embedContentAdmin] });
    }

    if(lastEmbedMessageStudent && sessionStarted) {
        const embedContentStudent = new MessageEmbed()
	      .setColor('#a652bb')
	      .setTitle(`${CLASS} TP en cours...`)
	      .setDescription("La file d'attente des tickets se mettra à jour automatiquement ici")
	      .setThumbnail(member.guild.iconURL());
        
        fillEmbedWithTickets(embedContentStudent)

        embedContentStudent.setTimestamp()

        lastEmbedMessageStudent.edit({ embeds: [embedContentStudent] });
    }
}

/**
 * 
 * @param {import('discord.js').MessageEmbed} embed 
 */
function fillEmbedWithTickets(embed) {
    if (queue.isEmpty()) {
        embed.addFields({
            name: `Vide`,
            value: 'Aucune question en attente !'
        });
        return;
    }
    ticketList.forEach((val) => {
        embed.addFields({
            name: `Ticket `,
            value: `Groupe ` + val
        });
    });
}

/**
 * 
 * @param {import('discord.js').Message<boolean>} message 
 */
function listTicketsEmbedAdmin(message) {
    const embedContent = new MessageEmbed()
	  .setColor('#0099ff')
	  .setTitle(`${CLASS} File d'attente tickets`)
	  .setDescription("La file d'attente des tickets se mettra Ã  jour automatiquement ici, `➡️` pour passez au ticket suivant")
      .setThumbnail(message.guild.iconURL());

    fillEmbedWithTickets(embedContent);
    
    embedContent.setTimestamp();

    message.channel.send({ embeds: [embedContent] })
        .then((msg) => {
            lastEmbedMessageAdmin = msg;
            msg.react('➡️')
        });
}

/**
 * 
 * @param {import('discord.js').Message<boolean>} message 
 */
function listTicketsEmbedStudent(message) {
    sessionStarted = true;
    log("Debut du TP ...");

    const embedContent = new MessageEmbed()
	  .setColor('#a652bb')
	  .setTitle(`${CLASS} TP en cours ...`)
	  .setDescription("La file d'attente des tickets se mettra a jour automatiquement ici")
	  .setThumbnail(currentGuild.iconURL());

    fillEmbedWithTickets(embedContent);

    embedContent.setTimestamp();

    message.channel.send({ embeds: [embedContent] })
        .then((msg) => {
            lastEmbedMessageStudent = msg;
        });
}


/**
 * DEV COMMANDS BELOW
 */

/**
 * 
 * @param {import('discord.js').Message<boolean>} message 
 */
function clearChannelCommand(message) {
    if (!hasAdminPermissions(message.member)) return;

    message.channel.bulkDelete(100).then(messages => log(`Bulk deleted ${messages.size} messages`))
}

/**
 * 
 * @param {import('discord.js').Message<boolean>} message 
 */
function pongCommand(message) {
    if (!hasAdminPermissions(message.member)) return;

    message.channel.send("Pong!").then((msg) => {
        setTimeout(() => msg.delete().catch(error), 4000)
    });

    setTimeout(() => message.delete().catch(error), 4000)
}


module.exports = {
    helpCommand,
    ticketCommand,
    manageNextTicket,
    manageNextTicketCommand,
    startSessionCommand,
    autoListCommand,
    endEmbedStudent,
    clearChannelCommand,
    pongCommand,
    updateListTicketsEmbed,
    fillEmbedWithTickets,
    listTicketsEmbedAdmin,
    listTicketsEmbedStudent
}