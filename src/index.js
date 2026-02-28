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
    this.commands = new CommandHandler(this);
    
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
    this.client.once('ready', () => {
      this.isReady = true;
      this.serverCount = this.client.guilds.cache.size;
      
      logger.info(`🟢 Logged in as ${this.client.user.tag}`);
      logger.info(`📊 Serving ${this.serverCount} servers`);
      logger.info(`🤖 Multi-agent system active: Kelly, Bruce, Gamma`);
      
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

    // Slash command handler
    this.client.on('interactionCreate', async (interaction) => {
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
      
      // Log for monitoring
      logger.info(`[${personaKey}] ${message.author.username}: "${message.content.slice(0, 30)}..." -> ${result.source} (${result.latency}ms)`);
      
      // Send response if exists
      if (result.response) {
        await this.agents.sendAs(personaKey, message.channel, result.response);
        
        // Add to history
        this.agents.addToHistory(message.author.id, {
          type: 'message',
          content: message.content,
          response: result.response,
          persona: personaKey,
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
