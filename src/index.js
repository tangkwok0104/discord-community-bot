/**
 * MAIN BOT ENTRY POINT
 * 
 * Initializes Discord client, connects systems, starts listening
 */

require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const TriageSystem = require('./core/triage');
const { MultiAgentSystem } = require('./core/agents');
const CommandHandler = require('./core/commands');
const FAQSystem = require('./core/faq');
const RulesManager = require('./core/rules');
const RAGSystem = require('./core/rag');
const AnalyticsSystem = require('./core/analytics');
const logger = require('./utils/logger');
const { initializeDatabase } = require('./services/database');
const { initializeRedis } = require('./services/redis');

class CommunityBot {
  constructor() {
    // Discord client with minimal required intents
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
      ],
      presence: {
        status: 'online',
        activities: [{ name: 'your community', type: 3 }] // Watching
      }
    });

    // Core systems
    this.triage = new TriageSystem();
    this.agents = new MultiAgentSystem();
    this.faq = new FAQSystem();
    this.rules = new RulesManager();
    this.rag = new RAGSystem();
    this.analytics = new AnalyticsSystem();
    this.commands = new CommandHandler(this);

    // Wire FAQ and RAG systems into triage for database lookups
    this.triage.setFAQSystem(this.faq);
    this.triage.setRAGSystem(this.rag);

    // State tracking
    this.isReady = false;
    this.serverCount = 0;
    this.messageCount = 0;

    // Bind event handlers
    this.setupEventHandlers();
  }

  /**
   * Initialize and start the bot
   */
  async start() {
    try {
      logger.info('🚀 Starting Community Bot...');

      // Initialize services
      await initializeDatabase();
      await initializeRedis();

      // Login to Discord
      await this.client.login(process.env.DISCORD_TOKEN);

      logger.info('✅ Bot started successfully!');

    } catch (error) {
      logger.error('❌ Failed to start bot:', error);
      process.exit(1);
    }
  }

  /**
   * Setup Discord event handlers
   */
  setupEventHandlers() {
    // Ready event
    this.client.once('ready', async () => {
      this.isReady = true;
      this.serverCount = this.client.guilds.cache.size;

      logger.info(`🟢 Logged in as ${this.client.user.tag}`);
      logger.info(`📊 Serving ${this.serverCount} servers`);
      logger.info(`🤖 Multi-agent system active: Otter 🦦, Bear 🐻, Owl 🦉`);

      // Start analytics periodic flush
      this.analytics.startPeriodicFlush();

      // Register slash commands
      await this.commands.registerCommands();
    });

    // Message handler (main interaction)
    this.client.on('messageCreate', async (message) => {
      // Ignore bots and self
      if (message.author.bot) return;

      // Ignore DMs (for now)
      if (!message.guild) return;

      // Process message
      await this.handleMessage(message);
    });

    // New member handler
    this.client.on('guildMemberAdd', async (member) => {
      await this.handleNewMember(member);
    });

    // Slash command + Button interaction handler
    this.client.on('interactionCreate', async (interaction) => {
      // Handle button clicks (rule approvals, etc.)
      if (interaction.isButton()) {
        try {
          const handled = await this.rules.handleButtonInteraction(interaction);
          if (handled) return;
        } catch (err) {
          logger.error('Button interaction error:', err);
        }
        return;
      }

      // Handle slash commands
      await this.commands.handleInteraction(interaction);
    });

    // Error handling
    this.client.on('error', (error) => {
      logger.error('Discord client error:', error);
    });

    // Disconnect handling
    this.client.on('disconnect', () => {
      logger.warn('Discord client disconnected. Attempting reconnect...');
    });
  }

  /**
   * Handle incoming message
   */
  async handleMessage(message) {
    try {
      this.messageCount++;

      // Select persona based on message context
      const personaKey = this.agents.selectPersona(message.content, {
        serverId: message.guild.id,
        userId: message.author.id,
        channelId: message.channel.id
      });

      const persona = this.agents.getPersona(personaKey);

      // Build context for triage
      const context = {
        serverId: message.guild.id,
        serverName: message.guild.name,
        userId: message.author.id,
        username: message.author.username,
        channelId: message.channel.id,
        persona: persona
      };

      // Process through triage system
      const result = await this.triage.processMessage(message.content, context);

      // Track analytics
      this.analytics.trackMessage(message.guild.id, result.classification, result.source);
      if (result.source === 'fallback') {
        this.analytics.trackUnanswered(message.guild.id, message.content, message.author.id);
      }

      // Log for monitoring
      logger.info(`[${personaKey}] ${message.author.username}: "${message.content.slice(0, 30)}..." -> ${result.source} (${result.latency}ms)`);

      // === MODERATION ACTIONS ===
      if (result.moderationAction) {
        const effectivePersona = 'bear'; // Bear handles all moderation

        // Execute moderation action
        try {
          // Both 'delete' and 'timeout' actions should remove the offending message
          if (['delete', 'timeout'].includes(result.moderationAction)) {
            await message.delete().catch(() => { });
            logger.info(`🗑️ Deleted message from ${message.author.username} (${result.classification})`);
          }

          // Apply timeout if required
          if (result.moderationAction === 'timeout') {
            const member = await message.guild.members.fetch(message.author.id);
            await member.timeout(60 * 1000, `Auto-moderated: ${result.classification}`); // 1 min timeout
            logger.info(`⏱️ Timed out ${message.author.username} for 1 minute (${result.classification})`);
          }
        } catch (modError) {
          logger.error('Moderation action failed (permissions?):', modError.message);
        }

        // Send warning response
        if (result.response) {
          await this.agents.sendAs(effectivePersona, message.channel, result.response);
        }

        // Log to admin channel
        await this.agents.sendToAdminLog(message.guild, {
          title: `${result.classification.toUpperCase()} Detected`,
          description: `Bear auto-moderated a message in #${message.channel.name}`,
          user: `${message.author.tag} (${message.author.id})`,
          type: result.classification,
          action: result.moderationAction === 'delete' ? 'Message Deleted' :
            result.moderationAction === 'timeout' ? 'User Timed Out (1 min)' : 'Warned',
          severity: ['raid', 'phishing'].includes(result.classification) ? 'high' : 'medium',
          messageContent: message.content
        });

        return; // Don't process further
      }

      // === NORMAL RESPONSE ===
      if (result.response) {
        // Handle rules_intent classification -> forward to rules system
        const effectivePersona = result.classification === 'rules_intent' ? 'bear' : personaKey;

        await this.agents.sendAs(effectivePersona, message.channel, result.response);

        // Add to history
        this.agents.addToHistory(message.author.id, {
          type: 'message',
          content: message.content,
          response: result.response,
          persona: effectivePersona,
          source: result.source
        });
      }

    } catch (error) {
      logger.error('Message handling error:', error);

      // Graceful degradation: Send fallback
      try {
        await message.channel.send('🤖 I\'m having a moment. Please try again!');
      } catch (fallbackError) {
        logger.error('Fallback also failed:', fallbackError);
      }
    }
  }

  /**
   * Handle new member joining
   */
  async handleNewMember(member) {
    try {
      logger.info(`👋 New member joined: ${member.user.tag} (${member.guild.name})`);

      // Find welcome channel
      const welcomeChannel = member.guild.channels.cache.find(
        channel => channel.name.includes('welcome') || channel.name.includes('general')
      );

      if (welcomeChannel) {
        await this.agents.welcomeNewMember(member, welcomeChannel);

        // Check for milestone celebrations
        const count = member.guild.memberCount;
        if (this.analytics.checkMilestone(count)) {
          await this.agents.sendAs('owl', welcomeChannel,
            `🎉🦉 **MILESTONE REACHED!** This community just hit **${count.toLocaleString()} members!** Amazing growth! 📈`
          );
        }
      }

    } catch (error) {
      logger.error('Welcome handler error:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('🛑 Shutting down gracefully...');

    // Flush analytics before shutdown
    await this.analytics.shutdown();

    // Set offline status
    if (this.client.user) {
      await this.client.user.setStatus('invisible');
    }

    // Destroy client
    this.client.destroy();

    // Log stats
    logger.info(`📊 Final stats: ${this.messageCount} messages processed`);
    logger.info(`💰 Cost report:`, this.triage.getCostReport());

    logger.info('👋 Goodbye!');
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  if (global.bot) {
    await global.bot.shutdown();
  }
});

process.on('SIGTERM', async () => {
  if (global.bot) {
    await global.bot.shutdown();
  }
});

// Start bot
const bot = new CommunityBot();
global.bot = bot;
bot.start();

module.exports = CommunityBot;
