/**
 * MULTI-AGENT SYSTEM
 * 
 * Implements Kelly, Bruce, and Gamma as distinct personas
 * Uses Discord Webhooks for instant name/avatar switching
 * Single bot token, multiple personalities
 */

const { WebhookClient, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

// Agent Personas Configuration (Animal Team)
const PERSONAS = {
  otter: {
    name: 'Otter (Welcome Agent)',
    avatar: 'https://cdn.discordapp.com/attachments/placeholder/otter.png',
    description: 'Playful, helpful community guide',
    tone: 'warm, bubbly, enthusiastic',
    color: 0x8B4513, // Brown (otter color)
    role: 'welcome',
    greeting: 'Hey there! Welcome! 🦦',
    farewell: 'See you around! 👋'
  },

  bear: {
    name: 'Bear (Mod Agent)',
    avatar: 'https://cdn.discordapp.com/attachments/placeholder/bear.png',
    description: 'Protective, gentle giant moderation specialist',
    tone: 'firm but kind, protective, fair',
    color: 0x8B4513, // Brown (bear color)
    role: 'moderation',
    greeting: 'Hey, I\'m Bear. Let\'s keep this community safe and friendly. 🐻',
    farewell: 'Stay safe out there.'
  },

  owl: {
    name: 'Owl (Analytics)',
    avatar: 'https://cdn.discordapp.com/attachments/placeholder/owl.png',
    description: 'Wise, data-driven insights and reporting',
    tone: 'analytical, precise, thoughtful',
    color: 0x800080, // Purple (wise owl)
    role: 'analytics',
    greeting: 'Greetings. Owl here, monitoring and analyzing. 🦉',
    farewell: 'Logging off. Wisdom preserved.'
  }
};

class MultiAgentSystem {
  constructor() {
    this.webhooks = new Map(); // channelId -> webhook
    this.activePersona = 'otter'; // Default
    this.conversationHistory = new Map(); // userId -> history
  }

  /**
   * Initialize webhook for a channel
   */
  async initializeWebhook(channel) {
    try {
      // Check if webhook already exists
      const webhooks = await channel.fetchWebhooks();
      let webhook = webhooks.find(wh => wh.name === 'Community Agents');

      if (!webhook) {
        // Create new webhook
        webhook = await channel.createWebhook({
          name: 'Community Agents',
          avatar: PERSONAS.otter.avatar,
          reason: 'Multi-agent community management'
        });
      }

      this.webhooks.set(channel.id, webhook);
      return webhook;

    } catch (error) {
      logger.error(`Failed to initialize webhook for ${channel.id}:`, error);
      return null;
    }
  }

  /**
   * Send message as specific persona
   */
  async sendAs(personaKey, channel, content, options = {}) {
    const persona = PERSONAS[personaKey];
    if (!persona) {
      logger.error(`Unknown persona: ${personaKey}`);
      return null;
    }

    try {
      // Get or initialize webhook
      let webhook = this.webhooks.get(channel.id);
      if (!webhook) {
        webhook = await this.initializeWebhook(channel);
      }

      if (!webhook) {
        // Fallback: Send as regular bot
        return await channel.send({
          content: `**${persona.name}:** ${content}`,
          ...options
        });
      }

      // Send via webhook with persona
      const message = await webhook.send({
        content: content,
        username: persona.name,
        avatarURL: persona.avatar,
        embeds: options.embeds || [],
        components: options.components || [],
        flags: options.ephemeral ? 64 : undefined
      });

      logger.info(`Sent as ${personaKey}: ${content.slice(0, 50)}...`);
      return message;

    } catch (error) {
      logger.error(`Failed to send as ${personaKey}:`, error);

      // Fallback to regular message
      try {
        return await channel.send({
          content: `**${persona.name}:** ${content}`,
          ...options
        });
      } catch (fallbackError) {
        logger.error('Fallback also failed:', fallbackError);
        return null;
      }
    }
  }

  /**
   * Select best persona for message context
   */
  selectPersona(message, context) {
    const content = message.toLowerCase();

    // Toxicity keywords → Bear
    const toxicKeywords = ['ban', 'report', 'toxic', 'harass', 'spam', 'raid'];
    if (toxicKeywords.some(kw => content.includes(kw))) {
      return 'bear';
    }

    // Stats/analytics keywords → Owl
    const analyticsKeywords = ['stats', 'analytics', 'data', 'growth', 'report', 'metrics'];
    if (analyticsKeywords.some(kw => content.includes(kw))) {
      return 'owl';
    }

    // Welcome/greeting → Otter
    const welcomeKeywords = ['welcome', 'hello', 'hi ', 'new here', 'joining'];
    if (welcomeKeywords.some(kw => content.includes(kw))) {
      return 'otter';
    }

    // Default: Otter for general help
    return 'otter';
  }

  /**
   * Send welcome message to new member
   */
  async welcomeNewMember(member, channel) {
    const persona = PERSONAS.otter;

    const embed = new EmbedBuilder()
      .setColor(persona.color)
      .setTitle(`Welcome to ${member.guild.name}!`)
      .setDescription(`Hey ${member}! I'm ${persona.name}. 🦦`)
      .addFields(
        { name: '📋 Rules', value: 'Check <#rules> to get started', inline: true },
        { name: '❓ Help', value: 'Ask me anything!', inline: true },
        { name: '🎉 Fun', value: 'Join the conversation!', inline: true }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: 'I\'m here to help 24/7!' })
      .setTimestamp();

    await this.sendAs('otter', channel, '', { embeds: [embed] });

    // Store in conversation history
    this.addToHistory(member.id, {
      type: 'welcome',
      timestamp: Date.now(),
      persona: 'otter'
    });
  }

  /**
   * Send moderation alert
   */
  async sendModerationAlert(user, channel, reason, confidence) {
    const persona = PERSONAS.bear;

    let action = 'Monitoring';
    if (confidence > 90) action = 'Auto-moderated';
    else if (confidence > 70) action = 'Shadow muted (awaiting mod review)';

    const embed = new EmbedBuilder()
      .setColor(persona.color)
      .setTitle('🛡️ Moderation Alert')
      .setDescription(`${persona.name} has flagged activity 🐻`)
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Reason', value: reason, inline: true },
        { name: 'Confidence', value: `${confidence}%`, inline: true },
        { name: 'Action', value: action, inline: false }
      )
      .setFooter({ text: 'Review and take action if needed' })
      .setTimestamp();

    await this.sendAs('bear', channel, '', { embeds: [embed] });
  }

  /**
   * Send analytics report
   */
  async sendAnalyticsReport(channel, data) {
    const persona = PERSONAS.owl;

    const embed = new EmbedBuilder()
      .setColor(persona.color)
      .setTitle('📊 Weekly Analytics Report')
      .setDescription(`${persona.name} reporting 🦉`)
      .addFields(
        { name: 'New Members', value: `${data.newMembers}`, inline: true },
        { name: 'Active Users', value: `${data.activeUsers}`, inline: true },
        { name: 'Messages', value: `${data.messageCount}`, inline: true },
        { name: 'Top Channels', value: data.topChannels.join(', '), inline: false }
      )
      .setFooter({ text: 'Data-driven insights for your community' })
      .setTimestamp();

    await this.sendAs('owl', channel, '', { embeds: [embed] });
  }

  /**
   * Add to conversation history
   */
  addToHistory(userId, data) {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }

    const history = this.conversationHistory.get(userId);
    history.push({
      ...data,
      timestamp: Date.now()
    });

    // Keep only last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const filtered = history.filter(h => h.timestamp > thirtyDaysAgo);
    this.conversationHistory.set(userId, filtered);
  }

  /**
   * Get conversation history for user
   */
  getHistory(userId) {
    return this.conversationHistory.get(userId) || [];
  }

  /**
   * Get persona configuration
   */
  getPersona(key) {
    return PERSONAS[key];
  }

  /**
   * Get all personas
   */
  getAllPersonas() {
    return PERSONAS;
  }

  /**
   * Send moderation event to #admin-logs channel
   * Creates the channel if it doesn't exist
   */
  async sendToAdminLog(guild, logData) {
    try {
      // Find or create admin-logs channel
      let adminChannel = guild.channels.cache.find(
        ch => ch.name === 'admin-logs' || ch.name === 'mod-logs'
      );

      if (!adminChannel) {
        // Create a private admin-logs channel (only visible to admins)
        adminChannel = await guild.channels.create({
          name: 'admin-logs',
          topic: '🛡️ Automated moderation logs | Bear Agent',
          permissionOverwrites: [
            {
              id: guild.id, // @everyone
              deny: ['ViewChannel']
            }
          ],
          reason: 'Auto-created by Bear for moderation logging'
        });
        logger.info(`Created #admin-logs channel in ${guild.name}`);
      }

      const embed = new EmbedBuilder()
        .setColor(logData.severity === 'high' ? 0xFF0000 : logData.severity === 'medium' ? 0xFFA500 : 0xFFFF00)
        .setTitle(`🛡️ ${logData.title}`)
        .setDescription(logData.description || 'Moderation event logged')
        .addFields(
          { name: 'User', value: logData.user || 'Unknown', inline: true },
          { name: 'Type', value: logData.type || 'Unknown', inline: true },
          { name: 'Action Taken', value: logData.action || 'Logged', inline: true }
        )
        .setFooter({ text: 'Bear 🐻 Moderation System' })
        .setTimestamp();

      if (logData.messageContent) {
        embed.addFields({ name: 'Original Message', value: logData.messageContent.slice(0, 1024) });
      }

      await adminChannel.send({ embeds: [embed] });

    } catch (error) {
      logger.error('Failed to send admin log:', error);
    }
  }
}

module.exports = { MultiAgentSystem, PERSONAS };
