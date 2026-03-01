/**
 * TRIAGE SYSTEM — The Brain of the Bot
 * 
 * Implements 3-Layer Architecture:
 * 1. Cache Layer (Redis) — $0 cost, 40-60% hit rate
 * 2. Filter Layer (Flash-Lite) — $0.00001 cost, filters 70-80% of messages
 * 3. AI Layer (Gemini Pro) — $0.02 cost, only for complex queries
 * 
 * Goal: Reduce API costs by 80-90% while maintaining quality
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const redis = require('../services/redis');
const logger = require('../utils/logger');

// === MODERATION PATTERNS ===
const PII_PATTERNS = {
  phone: /(?:\+?\d{1,3}[-\s.]?)?\(?\d{2,4}\)?[-\s.]?\d{3,4}[-\s.]?\d{3,5}/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  address: /\b\d{1,5}\s[A-Z][a-z]+\s(?:St|Ave|Blvd|Dr|Rd|Ln|Way|Ct|Pl)\b/gi
};

const PHISHING_DOMAINS = [
  'discord-nltro', 'discorcl', 'dlscord', 'disc0rd', 'stearn',
  'steamcommunlty', 'free-nitro', 'gift-nitro', 'nitro-gift',
  'discord-airdrop', 'discordgift', 'discordapp-gift'
];

const ZALGO_REGEX = /[\u0300-\u036f\u0489]{3,}/;

class TriageSystem {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Flash-Lite for cheap classification
    this.flashLite = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        maxOutputTokens: 10,
        temperature: 0.1,
      }
    });

    // Gemini Flash for complex responses (lower cost than Pro)
    this.geminiPro = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.3,
      }
    });

    // Cost tracking
    this.costTracker = {
      flashLiteCalls: 0,
      geminiProCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalCost: 0
    };

    // Raid / spam tracking
    this.recentMessages = new Map(); // hash -> { count, users[], timestamp }
    this.userMessageRates = new Map(); // `${serverId}:${userId}` -> timestamps[]
  }

  /**
   * Main entry point: Process incoming message
   * @param {string} message — User message
   * @param {object} context — Server/user context
   * @returns {object} — Response + metadata
   */
  async processMessage(message, context) {
    const startTime = Date.now();

    try {
      // LAYER 0: Instant Moderation Checks (regex, no AI cost)
      const modResult = this.instantModerationCheck(message, context);
      if (modResult) {
        return {
          response: modResult.response,
          source: modResult.source,
          cost: 0,
          latency: Date.now() - startTime,
          persona: context.persona,
          classification: modResult.classification,
          moderationAction: modResult.action // 'delete', 'timeout', 'warn'
        };
      }

      // LAYER 1: Check Cache (Semantic)
      const cached = await this.checkCache(message, context.serverId);
      if (cached) {
        this.costTracker.cacheHits++;
        return {
          response: cached,
          source: 'cache',
          cost: 0,
          latency: Date.now() - startTime,
          persona: context.persona
        };
      }

      // LAYER 2: Flash-Lite Classification
      const classification = await this.classifyMessage(message);
      this.costTracker.flashLiteCalls++;
      this.costTracker.totalCost += 0.00001; // ~$0.00001 per call

      // Handle based on classification
      let response;
      let source;

      switch (classification) {
        case 'greeting':
          response = this.getGreetingResponse();
          source = 'hardcoded';
          break;

        case 'junk':
          response = null; // Ignore
          source = 'filtered';
          break;

        case 'faq':
          response = await this.getFAQResponse(message, context);
          source = 'faq_db';
          break;

        case 'rules_intent':
          // User wants to change rules — let AI respond with guidance
          response = await this.generateAIResponse(message, {
            ...context,
            persona: {
              name: 'Bear (Mod Agent)',
              description: 'Protective moderation specialist who helps manage server rules',
              tone: 'firm but helpful'
            }
          });
          source = 'rules_intent';
          break;

        case 'toxic': {
          const toxResult = await this.handleToxicity(message, context);
          if (toxResult) {
            return {
              response: toxResult.response,
              source: 'moderation',
              cost: this.costTracker.totalCost,
              latency: Date.now() - startTime,
              persona: context.persona,
              classification: 'toxic',
              moderationAction: toxResult.action
            };
          }
          response = null;
          source = 'moderation';
          break;
        }

        case 'complex':
        default:
          // LAYER 3: Gemini Pro (expensive, only when needed)
          response = await this.generateAIResponse(message, context);
          source = 'gemini_pro';
          this.costTracker.geminiProCalls++;
          this.costTracker.totalCost += 0.02; // ~$0.02 per call
          break;
      }

      // Cache the response (if not null and not toxic)
      if (response && classification !== 'toxic') {
        await this.cacheResponse(message, response, context.serverId);
      }

      return {
        response,
        source,
        cost: this.getLastCallCost(),
        latency: Date.now() - startTime,
        persona: context.persona,
        classification
      };

    } catch (error) {
      logger.error('Triage system error:', error);

      // Graceful degradation
      return {
        response: this.getFallbackResponse(),
        source: 'fallback',
        cost: 0,
        latency: Date.now() - startTime,
        persona: context.persona,
        error: true
      };
    }
  }

  /**
   * Check semantic cache (Redis + vector similarity)
   */
  async checkCache(message, serverId) {
    try {
      // Simple implementation: exact match + recent (24h)
      const cacheKey = `cache:${serverId}:${this.hashMessage(message)}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;

        // Cache valid for 24 hours
        if (age < 86400000) {
          return parsed.response;
        }
      }

      this.costTracker.cacheMisses++;
      return null;

    } catch (error) {
      logger.error('Cache check error:', error);
      return null;
    }
  }

  /**
   * Cache response for future use
   */
  async cacheResponse(message, response, serverId) {
    try {
      const cacheKey = `cache:${serverId}:${this.hashMessage(message)}`;
      const value = JSON.stringify({
        response,
        timestamp: Date.now()
      });

      // Expire after 24 hours
      await redis.setex(cacheKey, 86400, value);

    } catch (error) {
      logger.error('Cache store error:', error);
    }
  }

  /**
   * Classify message using Flash-Lite
   */
  async classifyMessage(message) {
    const prompt = `
Classify this Discord message into ONE category:
- greeting: "hi", "hello", "hey", "sup", "yo", "morning", "lol", "haha"
- junk: spam, random characters, nonsensical
- faq: questions about rules, pricing, how-to, refunds, roles, events
- rules_intent: user wants to add/change/suggest a community rule
- toxic: insults, harassment, threats, slurs, passive-aggressive attacks
- complex: everything else that needs AI

Message: "${message}"

Respond with ONLY the category word (greeting/junk/faq/rules_intent/toxic/complex):
`;

    try {
      const result = await this.flashLite.generateContent(prompt);
      const classification = result.response.text().trim().toLowerCase();

      // Validate classification
      const validClasses = ['greeting', 'junk', 'faq', 'rules_intent', 'toxic', 'complex'];
      if (validClasses.includes(classification)) {
        return classification;
      }

      return 'complex'; // Default to AI if uncertain

    } catch (error) {
      logger.error('Classification error:', error);
      return 'complex'; // Fail safe: use AI
    }
  }

  /**
   * Get hardcoded greeting response
   */
  getGreetingResponse() {
    const greetings = [
      "Hey there! 👋 How can I help?",
      "Hello! Welcome to the community! 🎉",
      "Hi! What's up?",
      "Hey! Good to see you! 😊"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  /**
   * Get FAQ response from database
   */
  /**
   * Set the FAQ system reference (called from CommunityBot)
   */
  setFAQSystem(faqSystem) {
    this.faqSystem = faqSystem;
  }

  /**
   * Set the RAG system reference (called from CommunityBot)
   */
  setRAGSystem(ragSystem) {
    this.ragSystem = ragSystem;
  }

  async getFAQResponse(message, context) {
    // Try FAQ database first (free)
    if (this.faqSystem) {
      const faqAnswer = await this.faqSystem.findAnswer(message, context.serverId);
      if (faqAnswer) {
        return faqAnswer;
      }
    }

    // Try RAG knowledge base second (cheap — just embedding cost)
    if (this.ragSystem) {
      const ragResults = await this.ragSystem.search(message, context.serverId);
      if (ragResults.length > 0) {
        // Use RAG context to generate a grounded answer
        const ragContext = ragResults.join('\n---\n');
        return this.generateRAGResponse(message, ragContext, context);
      }
    }

    // No FAQ or RAG match — fall back to Gemini Pro (paid)
    this.costTracker.geminiProCalls++;
    this.costTracker.totalCost += 0.02;
    return this.generateAIResponse(message, context);
  }

  /**
   * Handle toxic content
   */
  async handleToxicity(message, context) {
    logger.warn(`⚠️ Toxic content detected in ${context.serverId} by ${context.username}: "${message.slice(0, 80)}"`);

    try {
      // Use Gemini Pro to assess severity
      const assessPrompt = `
You are a Discord moderation assistant. Assess this message for toxicity.

Message: "${message}"
Server: ${context.serverName}
User: ${context.username}

Respond in JSON ONLY:
{"severity": <1-10>, "reason": "<short reason>", "action": "<warn|mute|escalate>"}
`;
      const result = await this.geminiPro.generateContent(assessPrompt);
      this.costTracker.geminiProCalls++;
      this.costTracker.totalCost += 0.02;

      let assessment;
      try {
        const text = result.response.text().trim();
        assessment = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, ''));
      } catch {
        assessment = { severity: 5, reason: 'Could not parse', action: 'escalate' };
      }

      // Low severity (1-3): just monitor
      if (assessment.severity <= 3) {
        logger.info(`Low toxicity (${assessment.severity}/10), monitoring only.`);
        return null;
      }

      // Medium+ severity: warn and log
      logger.warn(`Toxicity severity ${assessment.severity}/10 — action: ${assessment.action} — reason: ${assessment.reason}`);

      if (assessment.severity >= 7) {
        return {
          response: `⚠️ **Please keep the conversation respectful.** Our moderation team has been notified.`,
          action: 'delete'
        };
      }

      return {
        response: `💬 Hey ${context.username}, let's keep things friendly! If you have concerns, reach out to a moderator.`,
        action: 'delete'
      };

    } catch (error) {
      logger.error('Toxicity assessment error:', error);
      // Fail safe: escalate to human mods
      return null;
    }
  }

  /**
   * Generate AI response using Gemini Pro
   */
  async generateAIResponse(message, context) {
    const prompt = `
You are ${context.persona.name}, ${context.persona.description}.
Tone: ${context.persona.tone}

Server Context:
- Server: ${context.serverName}
- User: ${context.username}

User Message: "${message}"

Respond naturally in character. Be helpful but concise (max 2 sentences).
`;

    try {
      const result = await this.geminiPro.generateContent(prompt);
      return result.response.text().trim();

    } catch (error) {
      logger.error('Gemini Pro error:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Generate a RAG-grounded response using retrieved knowledge chunks
   */
  async generateRAGResponse(message, ragContext, context) {
    const prompt = `
You are ${context.persona.name}, ${context.persona.description}.
Tone: ${context.persona.tone}

You have access to the following knowledge base documents for this server:
---
${ragContext}
---

Server: ${context.serverName}
User: ${context.username}
Question: "${message}"

Answer the question using ONLY the knowledge base above. If the answer isn't in the documents, say you don't have that information and suggest asking an admin. Be concise (max 3 sentences).
`;

    try {
      this.costTracker.geminiProCalls++;
      this.costTracker.totalCost += 0.02;
      const result = await this.geminiPro.generateContent(prompt);
      return result.response.text().trim();

    } catch (error) {
      logger.error('RAG response error:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * INSTANT MODERATION CHECK — $0 cost, pure regex
   * Returns null if message is clean, or moderation result if flagged
   */
  instantModerationCheck(message, context) {
    // 1. PII Detection (phone, email, SSN, address)
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      if (pattern.test(message)) {
        logger.warn(`🛡️ PII detected (${type}) in ${context.serverId} by ${context.username}`);
        return {
          response: `🛡️ **Your message was removed for your safety.** It appeared to contain personal information (${type}). Please be careful sharing private data!`,
          source: 'moderation_pii',
          classification: 'pii',
          action: 'delete'
        };
      }
    }

    // 2. Phishing / Scam Link Detection
    const msgLower = message.toLowerCase();
    for (const domain of PHISHING_DOMAINS) {
      if (msgLower.includes(domain)) {
        logger.warn(`🚨 Phishing detected in ${context.serverId} by ${context.username}: ${domain}`);
        return {
          response: `🚨 **Phishing attempt blocked!** This link has been flagged as a scam. Never click suspicious links!`,
          source: 'moderation_phishing',
          classification: 'phishing',
          action: 'delete'
        };
      }
    }

    // 3. Zalgo / Glitch Text
    if (ZALGO_REGEX.test(message)) {
      logger.warn(`🛡️ Zalgo text detected in ${context.serverId} by ${context.username}`);
      return {
        response: `🐻 Hey ${context.username}, please use normal text. Zalgo/glitch text disrupts the chat for everyone.`,
        source: 'moderation_zalgo',
        classification: 'zalgo',
        action: 'delete'
      };
    }

    // 4. Spam Rate Limiting (>5 messages in 10 seconds)
    const rateKey = `${context.serverId}:${context.userId}`;
    const now = Date.now();
    const userTimestamps = this.userMessageRates.get(rateKey) || [];
    const recent = userTimestamps.filter(t => now - t < 10000);
    recent.push(now);
    this.userMessageRates.set(rateKey, recent);

    if (recent.length > 5) {
      logger.warn(`🛡️ Spam detected in ${context.serverId} by ${context.username}: ${recent.length} msgs in 10s`);
      return {
        response: `⚠️ **Slow down, ${context.username}!** You're sending messages too fast. Please wait a moment.`,
        source: 'moderation_spam',
        classification: 'spam',
        action: 'timeout'
      };
    }

    // 5. Raid Detection (identical messages from multiple accounts)
    const msgHash = this.hashMessage(message);
    const raidEntry = this.recentMessages.get(msgHash) || { count: 0, users: new Set(), timestamp: now };
    if (now - raidEntry.timestamp < 30000) { // Within 30 seconds
      raidEntry.count++;
      raidEntry.users.add(context.userId);
      this.recentMessages.set(msgHash, raidEntry);

      if (raidEntry.users.size >= 3) {
        logger.warn(`🚨 RAID DETECTED in ${context.serverId}: ${raidEntry.users.size} users sent identical messages`);
        return {
          response: `🚨 **Potential raid detected!** Identical messages from multiple accounts. Moderators have been alerted.`,
          source: 'moderation_raid',
          classification: 'raid',
          action: 'timeout'
        };
      }
    } else {
      this.recentMessages.set(msgHash, { count: 1, users: new Set([context.userId]), timestamp: now });
    }

    // Clean up old rate-limit entries every 100 checks
    if (Math.random() < 0.01) this.cleanupRateLimits();

    return null; // Message is clean
  }

  /**
   * Clean up old rate limiting data
   */
  cleanupRateLimits() {
    const now = Date.now();
    for (const [key, timestamps] of this.userMessageRates.entries()) {
      const recent = timestamps.filter(t => now - t < 10000);
      if (recent.length === 0) this.userMessageRates.delete(key);
      else this.userMessageRates.set(key, recent);
    }
    for (const [key, entry] of this.recentMessages.entries()) {
      if (now - entry.timestamp > 30000) this.recentMessages.delete(key);
    }
  }

  /**
   * Fallback response when AI fails
   */
  getFallbackResponse() {
    return "🤖 I'm having trouble right now. Please try again in a moment!";
  }

  /**
   * Hash message for cache key
   */
  hashMessage(message) {
    return message.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 50);
  }

  /**
   * Get cost of last call
   */
  getLastCallCost() {
    return this.costTracker.totalCost;
  }

  /**
   * Get full cost report
   */
  getCostReport() {
    return {
      ...this.costTracker,
      cacheHitRate: this.costTracker.cacheHits /
        (this.costTracker.cacheHits + this.costTracker.cacheMisses || 1),
      avgCostPerMessage: this.costTracker.totalCost /
        (this.costTracker.flashLiteCalls + this.costTracker.geminiProCalls || 1)
    };
  }
}

module.exports = TriageSystem;
