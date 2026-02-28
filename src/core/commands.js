/**
 * SLASH COMMANDS
 * 
 * Discord slash command handlers
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');

// Command definitions
const commands = [
  new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask the AI agents a question')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('What do you want to ask?')
        .setRequired(true)
    ),
  
  new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure bot settings (Admin only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Toggle an agent on/off')
        .addStringOption(option =>
          option
            .setName('agent')
            .setDescription('Which agent?')
            .setRequired(true)
            .addChoices(
              { name: 'Otter 🦦 (Welcome)', value: 'otter' },
              { name: 'Bear 🐻 (Mod)', value: 'bear' },
              { name: 'Owl 🦉 (Analytics)', value: 'owl' }
            )
        )
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Enable or disable?')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current configuration')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName('faq')
    .setDescription('FAQ management')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a new FAQ (Admin only)')
        .addStringOption(option =>
          option
            .setName('question')
            .setDescription('The question')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('answer')
            .setDescription('The answer')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all FAQs')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View community statistics'),
  
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show bot help and commands')
];

class CommandHandler {
  constructor(bot) {
    this.bot = bot;
    this.commands = new Map();
    
    this.setupHandlers();
  }

  /**
   * Register commands with Discord
   */
  async registerCommands() {
    try {
      const rest = this.bot.client.rest;
      const clientId = this.bot.client.user.id;
      
      // Register globally (takes up to 1 hour to propagate)
      // For testing, use guild-specific registration
      await rest.put(
        `/applications/${clientId}/commands`,
        { body: commands.map(cmd => cmd.toJSON()) }
      );
      
      logger.info(`✅ Registered ${commands.length} slash commands`);
      
    } catch (error) {
      logger.error('Failed to register commands:', error);
    }
  }

  /**
   * Setup command handlers
   */
  setupHandlers() {
    this.commands.set('ask', this.handleAsk.bind(this));
    this.commands.set('config', this.handleConfig.bind(this));
    this.commands.set('faq', this.handleFAQ.bind(this));
    this.commands.set('stats', this.handleStats.bind(this));
    this.commands.set('help', this.handleHelp.bind(this));
  }

  /**
   * Handle incoming interaction
   */
  async handleInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return;
    
    const handler = this.commands.get(interaction.commandName);
    if (!handler) {
      logger.warn(`Unknown command: ${interaction.commandName}`);
      return;
    }
    
    try {
      // Defer reply immediately (Golden Standard: <200ms)
      await interaction.deferReply({ ephemeral: false });
      
      await handler(interaction);
      
    } catch (error) {
      logger.error(`Command error (${interaction.commandName}):`, error);
      
      await interaction.editReply({
        content: '🤖 Something went wrong. Please try again!'
      });
    }
  }

  /**
   * /ask command
   */
  async handleAsk(interaction) {
    const question = interaction.options.getString('question');
    
    // Process through triage
    const context = {
      serverId: interaction.guild.id,
      serverName: interaction.guild.name,
      userId: interaction.user.id,
      username: interaction.user.username,
      channelId: interaction.channel.id,
      persona: this.bot.agents.getPersona('otter')
    };
    
    const result = await this.bot.triage.processMessage(question, context);
    
    if (result.response) {
      await interaction.editReply(result.response);
    } else {
      await interaction.editReply('🤖 I\'m not sure how to answer that. Try rephrasing or ask a mod!');
    }
  }

  /**
   * /config command
   */
  async handleConfig(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'toggle') {
      const agent = interaction.options.getString('agent');
      const enabled = interaction.options.getBoolean('enabled');
      
      // TODO: Save to database
      await interaction.editReply(
        `✅ **${agent.charAt(0).toUpperCase() + agent.slice(1)}** is now ${enabled ? 'ENABLED' : 'DISABLED'}`
      );
      
    } else if (subcommand === 'view') {
      // TODO: Load from database
      const embed = {
        title: '⚙️ Bot Configuration',
        description: 'Current agent settings:',
        fields: [
          { name: 'Otter 🦦 (Welcome)', value: '🟢 Enabled', inline: true },
          { name: 'Bear 🐻 (Mod)', value: '🟢 Enabled', inline: true },
          { name: 'Owl 🦉 (Analytics)', value: '🔴 Disabled', inline: true }
        ],
        color: 0x3498db
      };
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  /**
   * /faq command
   */
  async handleFAQ(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'add') {
      const question = interaction.options.getString('question');
      const answer = interaction.options.getString('answer');
      
      // TODO: Add to FAQ database
      await interaction.editReply(
        `✅ FAQ added:\n**Q:** ${question}\n**A:** ${answer}`
      );
      
    } else if (subcommand === 'list') {
      // TODO: Load from database
      await interaction.editReply(
        '📚 **FAQs:**\n\n1. What are the rules?\n2. How do I get roles?\n3. How much does it cost?\n\nUse `/faq add` to add more!'
      );
    }
  }

  /**
   * /stats command
   */
  async handleStats(interaction) {
    // TODO: Load real stats
    const embed = {
      title: '📊 Community Statistics',
      description: `Stats for ${interaction.guild.name}`,
      fields: [
        { name: 'Total Members', value: `${interaction.guild.memberCount}`, inline: true },
        { name: 'Messages Today', value: '1,247', inline: true },
        { name: 'Active Users', value: '89', inline: true },
        { name: 'FAQs Answered', value: '156', inline: true },
        { name: 'Mod Actions', value: '3', inline: true },
        { name: 'Bot Uptime', value: '99.9%', inline: true }
      ],
      color: 0x2ecc71,
      timestamp: new Date().toISOString()
    };
    
    await interaction.editReply({ embeds: [embed] });
  }

  /**
   * /help command
   */
  async handleHelp(interaction) {
    const embed = {
      title: '🤖 Community Agent Help',
      description: 'I\'m Otter 🦦, and my teammates Bear 🐻 and Owl 🦉 help manage this community!',
      fields: [
        { 
          name: '💬 Commands', 
          value: '`/ask <question>` - Ask me anything\n`/stats` - View community stats\n`/help` - Show this message'
        },
        { 
          name: '⚙️ Admin Commands', 
          value: '`/config toggle <agent> <on/off>` - Enable/disable agents\n`/faq add <Q> <A>` - Add FAQ\n`/faq list` - View all FAQs'
        },
        { 
          name: '👥 The Team', 
          value: '**Otter 🦦** - Welcome & Support (that\'s me!)\n**Bear 🐻** - Moderation & Safety\n**Owl 🦉** - Analytics & Insights'
        }
      ],
      color: 0xe74c3c,
      footer: { text: 'Made with ❤️ by OpenClaw' }
    };
    
    await interaction.editReply({ embeds: [embed] });
  }
}

module.exports = CommandHandler;
