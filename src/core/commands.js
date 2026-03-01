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
    .setName('rules')
    .setDescription('Manage server rules')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set all rules (Owner only)')
        .addStringOption(option =>
          option
            .setName('rules_text')
            .setDescription('Rules separated by semicolons (e.g. No spam; Be respectful; No NSFW)')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Propose a new rule (requires admin approval)')
        .addStringOption(option =>
          option
            .setName('rule')
            .setDescription('The rule to add')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current server rules')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('knowledge')
    .setDescription('Manage the AI knowledge base (RAG)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('upload')
        .setDescription('Upload a document to the knowledge base (Admin only)')
        .addAttachmentOption(option =>
          option
            .setName('file')
            .setDescription('Text file (.txt, .md) to ingest')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View knowledge base statistics')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('clear')
        .setDescription('Clear all knowledge for this server (Owner only)')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

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
    this.commands.set('rules', this.handleRules.bind(this));
    this.commands.set('knowledge', this.handleKnowledge.bind(this));
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

    // Get analytics summary
    const analytics = await this.bot.analytics.getSummary(interaction.guild.id);
    const totalSentiment = analytics.sentiment.positive + analytics.sentiment.neutral + analytics.sentiment.negative;
    const sentimentText = totalSentiment > 0
      ? `😊 ${analytics.sentiment.positive} | 😐 ${analytics.sentiment.neutral} | 😠 ${analytics.sentiment.negative}`
      : 'No data yet';

    // Find peak activity hour
    const peakHour = analytics.heatmap.indexOf(Math.max(...analytics.heatmap));
    const peakText = Math.max(...analytics.heatmap) > 0
      ? `${peakHour}:00 - ${peakHour + 1}:00 (${analytics.heatmap[peakHour]} msgs)`
      : 'No activity data';

    // RAG stats
    const ragStats = await this.bot.rag.getStats(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setTitle('📊 Community Statistics')
      .setDescription(`Full stats for **${interaction.guild.name}** — powered by Owl 🦉`)
      .addFields(
        { name: '👥 Total Members', value: `${interaction.guild.memberCount}`, inline: true },
        { name: '💬 Messages Processed', value: `${this.bot.messageCount}`, inline: true },
        { name: '💾 Cache Hit Rate', value: `${cacheRate}%`, inline: true },
        { name: '⚡ AI Calls (Flash)', value: `${costReport.flashLiteCalls}`, inline: true },
        { name: '🧠 AI Calls (Pro)', value: `${costReport.geminiProCalls}`, inline: true },
        { name: '💰 Est. Cost', value: `$${costReport.totalCost.toFixed(4)}`, inline: true },
        { name: '📈 Sentiment Today', value: sentimentText, inline: false },
        { name: '🔥 Peak Activity', value: peakText, inline: true },
        { name: '❓ Unanswered', value: `${analytics.unansweredCount} queries`, inline: true },
        { name: '📚 Knowledge Base', value: `${ragStats.documents} docs / ${ragStats.totalChunks} chunks`, inline: true }
      )
      .setColor(0x2ecc71)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  /**
   * /rules command
   */
  async handleRules(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (!this.bot.rules) {
      await interaction.editReply('⚠️ Rules system is not initialized.');
      return;
    }

    switch (subcommand) {
      case 'set': {
        const rulesText = interaction.options.getString('rules_text');
        await this.bot.rules.setRules(interaction, rulesText);
        break;
      }
      case 'add': {
        const rule = interaction.options.getString('rule');
        await this.bot.rules.proposeRule(interaction, rule, this.bot.agents);
        break;
      }
      case 'view': {
        await this.bot.rules.viewRules(interaction);
        break;
      }
    }
  }

  /**
   * /knowledge command
   */
  async handleKnowledge(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (!this.bot.rag) {
      await interaction.editReply('⚠️ Knowledge base system is not initialized.');
      return;
    }

    switch (subcommand) {
      case 'upload': {
        const file = interaction.options.getAttachment('file');

        // Validate file type
        const allowedTypes = ['.txt', '.md', '.csv', '.json'];
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!allowedTypes.includes(ext)) {
          await interaction.editReply(`❌ Unsupported file type \`${ext}\`. Allowed: ${allowedTypes.join(', ')}`);
          return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          await interaction.editReply('❌ File too large. Maximum size is 5MB.');
          return;
        }

        await interaction.editReply('📤 Uploading and processing document...');

        try {
          // Fetch file content
          const response = await fetch(file.url);
          const content = await response.text();

          // Ingest into RAG
          const result = await this.bot.rag.ingestDocument(
            interaction.guild.id,
            content,
            file.name
          );

          if (result.success) {
            await interaction.editReply(
              `✅ **Document ingested!**\n📄 File: \`${file.name}\`\n📦 Chunks created: ${result.chunksStored}\n\nThe bot can now answer questions from this document!`
            );
          } else {
            await interaction.editReply('❌ Failed to process document. Please try again.');
          }
        } catch (err) {
          logger.error('Knowledge upload error:', err);
          await interaction.editReply('❌ Error processing file: ' + err.message);
        }
        break;
      }

      case 'stats': {
        const stats = await this.bot.rag.getStats(interaction.guild.id);

        const embed = new EmbedBuilder()
          .setTitle('📚 Knowledge Base Stats')
          .setDescription(`Knowledge base for **${interaction.guild.name}**`)
          .addFields(
            { name: 'Documents', value: `${stats.documents}`, inline: true },
            { name: 'Total Chunks', value: `${stats.totalChunks}`, inline: true },
            { name: 'Files', value: stats.filenames.length > 0 ? stats.filenames.map(f => `• ${f}`).join('\n') : 'None uploaded yet' }
          )
          .setColor(0x3498db)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'clear': {
        const cleared = await this.bot.rag.clearKnowledge(interaction.guild.id);
        if (cleared) {
          await interaction.editReply('🗑️ Knowledge base cleared! All documents have been removed.');
        } else {
          await interaction.editReply('❌ Failed to clear knowledge base.');
        }
        break;
      }
    }
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
          value: '`/config toggle <agent> <on/off>` - Enable/disable agents\n`/faq add <Q> <A>` - Add FAQ\n`/faq list` - View all FAQs\n`/rules set <text>` - Set server rules\n`/rules add <rule>` - Propose a new rule\n`/rules view` - View current rules'
        },
        {
          name: '👥 The Team',
          value: '**Otter 🦦** - Welcome & Support (that\'s me!)\n**Bear 🐻** - Moderation & Safety\n**Owl 🦉** - Analytics & Insights'
        },
        {
          name: '🛡️ Auto-Moderation',
          value: 'Bear automatically detects and removes:\n• Phishing/scam links\n• Personal info (PII)\n• Spam flooding\n• Raid attacks\n• Zalgo/glitch text'
        }
      ],
      color: 0xe74c3c,
      footer: { text: 'Made with ❤️ by OpenClaw' }
    };

    await interaction.editReply({ embeds: [embed] });
  }
}

module.exports = CommandHandler;
