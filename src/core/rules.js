/**
 * RULES MANAGER
 * 
 * Manages server rules with Admin Approval workflow
 * - Stores rules per server in Firestore
 * - Approve/Deny button interactions for rule proposals
 * - Auto-posts formatted Rules Embed to #rules channel
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../services/database');
const logger = require('../utils/logger');

class RulesManager {
    constructor() {
        this.pendingProposals = new Map(); // messageId -> proposalData
    }

    /**
     * Get rules for a server from Firestore
     */
    async getRules(serverId) {
        try {
            const db = getDB();
            if (!db) return [];

            const doc = await db.collection('servers').doc(serverId).collection('config').doc('rules').get();
            if (!doc.exists) return [];
            return doc.data().rules || [];
        } catch (error) {
            logger.error('Get rules error:', error);
            return [];
        }
    }

    /**
     * Save rules for a server to Firestore
     */
    async saveRules(serverId, rules) {
        try {
            const db = getDB();
            if (!db) return false;

            await db.collection('servers').doc(serverId).collection('config').doc('rules').set({
                rules,
                updatedAt: new Date()
            }, { merge: true });

            return true;
        } catch (error) {
            logger.error('Save rules error:', error);
            return false;
        }
    }

    /**
     * Set initial rules (Owner only, via /rules set)
     */
    async setRules(interaction, rulesText) {
        const serverId = interaction.guild.id;

        // Parse rules (split by newline or semicolon)
        const rules = rulesText
            .split(/[;\n]+/)
            .map(r => r.trim())
            .filter(r => r.length > 0);

        const saved = await this.saveRules(serverId, rules);

        if (saved) {
            // Auto-post to #rules channel
            await this.postRulesEmbed(interaction.guild, rules);

            await interaction.editReply({
                content: `✅ **${rules.length} rules set!** They have been posted to the #rules channel.`
            });
        } else {
            await interaction.editReply({
                content: '❌ Failed to save rules. Database may be unavailable.'
            });
        }
    }

    /**
     * Propose a new rule (triggers Approve/Deny workflow)
     */
    async proposeRule(interaction, newRule, agentSystem) {
        const serverId = interaction.guild.id;
        const existingRules = await this.getRules(serverId);

        // Build the proposal embed
        const proposalEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('📋 Rule Change Proposal')
            .setDescription(`**${interaction.user.tag}** wants to add a new rule:`)
            .addFields(
                { name: '📝 Proposed Rule', value: `> ${newRule}` },
                {
                    name: '📊 Current Rules', value: existingRules.length > 0
                        ? existingRules.map((r, i) => `${i + 1}. ${r}`).join('\n')
                        : 'No rules set yet'
                },
                { name: '🔒 Approval Required', value: 'Only **Server Admins** can approve or deny this change.' }
            )
            .setFooter({ text: `Proposed by ${interaction.user.tag}` })
            .setTimestamp();

        // Build Approve/Deny buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`rule_approve_${Date.now()}`)
                    .setLabel('✅ Approve')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`rule_deny_${Date.now()}`)
                    .setLabel('❌ Deny')
                    .setStyle(ButtonStyle.Danger)
            );

        // Send to admin-logs channel
        let adminChannel = interaction.guild.channels.cache.find(
            ch => ch.name === 'admin-logs' || ch.name === 'mod-logs'
        );

        if (!adminChannel) {
            // Create admin-logs channel if it doesn't exist
            try {
                adminChannel = await interaction.guild.channels.create({
                    name: 'admin-logs',
                    topic: '🛡️ Automated moderation logs | Bear Agent',
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: ['ViewChannel'] }
                    ],
                    reason: 'Auto-created for rule approval workflow'
                });
            } catch (err) {
                logger.error('Failed to create admin-logs channel:', err);
                await interaction.editReply('❌ Could not find or create an admin-logs channel.');
                return;
            }
        }

        const approvalMsg = await adminChannel.send({
            embeds: [proposalEmbed],
            components: [row]
        });

        // Store pending proposal
        this.pendingProposals.set(approvalMsg.id, {
            serverId,
            newRule,
            proposedBy: interaction.user.tag,
            proposedById: interaction.user.id,
            existingRules,
            channelId: interaction.channel.id
        });

        await interaction.editReply({
            content: `📋 **Rule proposal submitted!** An admin must approve it in #admin-logs before it takes effect.`
        });
    }

    /**
     * Handle Approve/Deny button click
     */
    async handleButtonInteraction(interaction) {
        const customId = interaction.customId;
        if (!customId.startsWith('rule_approve_') && !customId.startsWith('rule_deny_')) {
            return false; // Not our button
        }

        // Check permissions: only Admins can click
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({
                content: '🔒 Only administrators can approve or deny rule changes.',
                ephemeral: true
            });
            return true;
        }

        const proposal = this.pendingProposals.get(interaction.message.id);
        if (!proposal) {
            await interaction.reply({
                content: '⚠️ This proposal has expired or already been handled.',
                ephemeral: true
            });
            return true;
        }

        if (customId.startsWith('rule_approve_')) {
            // APPROVED — add the rule and update #rules
            const updatedRules = [...proposal.existingRules, proposal.newRule];
            const saved = await this.saveRules(proposal.serverId, updatedRules);

            if (saved) {
                await this.postRulesEmbed(interaction.guild, updatedRules);

                // Update the approval message
                const approvedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor(0x00FF00)
                    .setTitle('✅ Rule APPROVED')
                    .addFields({ name: 'Approved By', value: interaction.user.tag });

                await interaction.update({
                    embeds: [approvedEmbed],
                    components: [] // Remove buttons
                });

                // Notify the proposer
                try {
                    const proposalChannel = interaction.guild.channels.cache.get(proposal.channelId);
                    if (proposalChannel) {
                        await proposalChannel.send(
                            `✅ **Rule approved!** "${proposal.newRule}" has been added by ${interaction.user.tag}. Check #rules for the update!`
                        );
                    }
                } catch (e) { /* silent */ }
            }
        } else {
            // DENIED
            const deniedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor(0xFF0000)
                .setTitle('❌ Rule DENIED')
                .addFields({ name: 'Denied By', value: interaction.user.tag });

            await interaction.update({
                embeds: [deniedEmbed],
                components: [] // Remove buttons
            });

            // Notify the proposer
            try {
                const proposalChannel = interaction.guild.channels.cache.get(proposal.channelId);
                if (proposalChannel) {
                    await proposalChannel.send(
                        `❌ **Rule denied.** Your proposal "${proposal.newRule}" was rejected by ${interaction.user.tag}.`
                    );
                }
            } catch (e) { /* silent */ }
        }

        // Clean up
        this.pendingProposals.delete(interaction.message.id);
        return true;
    }

    /**
     * Post (or update) a beautiful Rules Embed in #rules channel
     */
    async postRulesEmbed(guild, rules) {
        try {
            // Find the #rules channel
            let rulesChannel = guild.channels.cache.find(
                ch => ch.name === 'rules' || ch.name === 'server-rules'
            );

            if (!rulesChannel) {
                logger.warn(`No #rules channel found in ${guild.name}, skipping embed post.`);
                return;
            }

            // Build the formatted rules embed
            const rulesText = rules.map((rule, i) => `**${i + 1}.** ${rule}`).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor(0x5865F2) // Discord Blurple
                .setTitle(`📜 ${guild.name} — Community Rules`)
                .setDescription(rulesText || 'No rules have been set yet.')
                .addFields(
                    { name: '\u200B', value: '---' },
                    { name: '⚠️ Enforcement', value: 'Violations may result in warnings, timeouts, or bans. Bear 🐻 monitors chat 24/7.' },
                    { name: '📩 Appeals', value: 'If you believe a moderation action was unfair, contact a Server Admin.' }
                )
                .setFooter({ text: `Last updated • Managed by OpenClaw Bot` })
                .setTimestamp();

            // Try to find and update existing bot message, or send new
            const messages = await rulesChannel.messages.fetch({ limit: 20 });
            const existingBotMsg = messages.find(
                m => m.author.id === guild.client.user.id && m.embeds.length > 0 && m.embeds[0].title?.includes('Community Rules')
            );

            if (existingBotMsg) {
                await existingBotMsg.edit({ embeds: [embed] });
                logger.info(`Updated rules embed in #${rulesChannel.name}`);
            } else {
                await rulesChannel.send({ embeds: [embed] });
                logger.info(`Posted new rules embed in #${rulesChannel.name}`);
            }

        } catch (error) {
            logger.error('Post rules embed error:', error);
        }
    }

    /**
     * View current rules (formatted)
     */
    async viewRules(interaction) {
        const serverId = interaction.guild.id;
        const rules = await this.getRules(serverId);

        if (rules.length === 0) {
            await interaction.editReply('📜 No rules have been set yet. Use `/rules set` to create them!');
            return;
        }

        const rulesText = rules.map((rule, i) => `**${i + 1}.** ${rule}`).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📜 ${interaction.guild.name} Rules`)
            .setDescription(rulesText)
            .setFooter({ text: `${rules.length} rule(s) total` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
}

module.exports = RulesManager;
