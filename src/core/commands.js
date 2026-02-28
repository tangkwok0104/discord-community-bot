/**
 * SLASH COMMANDS
 * 
 * Discord slash command handlers
 */

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { saveServerConfig, getServerConfig } = require('../services/database');
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
    const serverId = interaction.guild.id;

    if (subcommand === 'toggle') {
      const agent = interaction.options.getString('agent');
      const enabled = interaction.options.getBoolean('enabled');

      // Save to database
      const configKey = `agents.${agent}.enabled`;
      const saved = await saveServerConfig(serverId, { [configKey]: enabled });

      if (saved) {
        await interaction.editReply(
          `✅ **${agent.charAt(0).toUpperCase() + agent.slice(1)}** is now ${enabled ? '🟢 ENABLED' : '🔴 DISABLED'}`
        );
      } else {
        await interaction.editReply(
          `✅ **${agent.charAt(0).toUpperCase() + agent.slice(1)}** toggled ${enabled ? 'ON' : 'OFF'} (saved locally — database unavailable)`
        );
      }

    } else if (subcommand === 'view') {
      // Load from database
      const config = await getServerConfig(serverId);
      const agents = config?.agents || {};

      const getStatus = (agentKey) => {
        const agentConfig = agents[agentKey];
        if (!agentConfig || agentConfig.enabled === undefined) return '🟢 Enabled (default)';
        return agentConfig.enabled ? '🟢 Enabled' : '🔴 Disabled';
      };

      const embed = new EmbedBuilder()
        .setTitle('⚙️ Bot Configuration')
        .setDescription(`Settings for **${interaction.guild.name}**`)
        .addFields(
          { name: 'Otter 🦦 (Welcome)', value: getStatus('otter'), inline: true },
          { name: 'Bear 🐻 (Mod)', value: getStatus('bear'), inline: true },
          { name: 'Owl 🦉 (Analytics)', value: getStatus('owl'), inline: true }
        )
        .setColor(0x3498db)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  }

  /**
   * /faq command
   */
  async handleFAQ(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const serverId = interaction.guild.id;

    if (subcommand === 'add') {
      const question = interaction.options.getString('question');
      const answer = interaction.options.getString('answer');

      // Save via FAQSystem
      const variations = [question.toLowerCase()];
      const success = await this.bot.faq.addFAQ(serverId, question, variations, answer);

      if (success) {
        await interaction.editReply(
          `✅ FAQ added!\n**Q:** ${question}\n**A:** ${answer}`
        );
      } else {
        await interaction.editReply('❌ Failed to save FAQ. Please try again.');
      }

    } else if (subcommand === 'list') {
      // Load from FAQSystem
      const faqs = await this.bot.faq.getAllFAQs(serverId);

      if (!faqs || faqs.length === 0) {
        await interaction.editReply('📚 No FAQs configured yet. Use `/faq add` to create one!');
        return;
      }

      const faqList = faqs.map((faq, i) =>
        `**${i + 1}.** ${faq.question}\n   → ${faq.answer}`
      ).join('\n\n');

      const embed = new EmbedBuilder()
        .setTitle('📚 FAQ List')
        .setDescription(faqList.slice(0, 4000))
        .setColor(0x9b59b6)
        .setFooter({ text: `${faqs.length} FAQ(s) total` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  }

  /**
   * /stats command
   */
  async handleStats(interaction) {
    const costReport = this.bot.triage.getCostReport();
    const cacheRate = (costReport.cacheHitRate * 100).toFixed(1);

    const embed = new EmbedBuilder()
      .setTitle('📊 Community Statistics')
      .setDescription(`Stats for **${interaction.guild.name}**`)
      .addFields(
        { name: 'Total Members', value: `${interaction.guild.memberCount}`, inline: true },
        { name: 'Messages Processed', value: `${this.bot.messageCount}`, inline: true },
        { name: 'Cache Hit Rate', value: `${cacheRate}%`, inline: true },
        { name: 'AI Calls (Flash)', value: `${costReport.flashLiteCalls}`, inline: true },
        { name: 'AI Calls (Pro)', value: `${costReport.geminiProCalls}`, inline: true },
        { name: 'Est. Cost', value: `$${costReport.totalCost.toFixed(4)}`, inline: true }
      )
      .setColor(0x2ecc71)
      .setTimestamp();

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
