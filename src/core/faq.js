/**
 * FAQ SYSTEM
 * 
 * Pre-loaded and custom FAQ management
 */

const { getFAQCollection } = require('../services/database');
const logger = require('../utils/logger');

// Default FAQs for new servers
const DEFAULT_FAQS = [
  {
    question: 'rules',
    variations: ['rules', 'what are the rules', 'server rules', 'guidelines'],
    answer: 'Please check <#rules> for our community guidelines! The main ones are: be respectful, no spam, and have fun! 😊'
  },
  {
    question: 'roles',
    variations: ['how do i get roles', 'roles', 'color roles', 'assign roles'],
    answer: 'You can get roles by reacting in <#roles> or using the /role command!'
  },
  {
    question: 'help',
    variations: ['help', 'support', 'i need help', 'assistance'],
    answer: 'I\'m here to help! What do you need assistance with? You can also ping a moderator if it\'s urgent.'
  },
  {
    question: 'pricing',
    variations: ['how much', 'price', 'cost', 'is it free', 'subscription'],
    answer: 'Our Pro tier is $49/mo and Business is $99/mo. Both include unlimited AI responses! Check our website for details.'
  },
  {
    question: 'bot',
    variations: ['what is this bot', 'who are you', 'what do you do', 'bot help'],
    answer: 'I\'m Kelly, your community assistant! I can answer questions, help with moderation, and keep track of community stats. My teammates Bruce and Gamma help too!'
  }
];

class FAQSystem {
  constructor() {
    this.cache = new Map(); // serverId -> faqs[]
  }

  /**
   * Initialize FAQs for a new server
   */
  async initializeServer(serverId) {
    try {
      const collection = getFAQCollection(serverId);
      if (!collection) {
        logger.warn('No database, using memory-only FAQs');
        this.cache.set(serverId, DEFAULT_FAQS);
        return;
      }

      // Check if already initialized
      const snapshot = await collection.limit(1).get();
      if (!snapshot.empty) {
        logger.info(`Server ${serverId} already has FAQs`);
        return;
      }

      // Add default FAQs
      for (const faq of DEFAULT_FAQS) {
        await collection.add({
          ...faq,
          createdAt: new Date(),
          isDefault: true
        });
      }

      logger.info(`Initialized default FAQs for server ${serverId}`);
      
    } catch (error) {
      logger.error('FAQ initialization error:', error);
      // Fallback to memory
      this.cache.set(serverId, DEFAULT_FAQS);
    }
  }

  /**
   * Find best matching FAQ
   */
  async findAnswer(query, serverId) {
    const query_lower = query.toLowerCase();
    
    // Get FAQs (from cache or DB)
    let faqs = this.cache.get(serverId);
    if (!faqs) {
      faqs = await this.loadFAQs(serverId);
    }

    // Simple matching (MVP)
    // TODO: Use semantic similarity for better matching
    for (const faq of faqs) {
      // Check main question
      if (query_lower.includes(faq.question)) {
        return faq.answer;
      }
      
      // Check variations
      for (const variation of faq.variations) {
        if (query_lower.includes(variation)) {
          return faq.answer;
        }
      }
    }

    return null; // No match found
  }

  /**
   * Load FAQs from database
   */
  async loadFAQs(serverId) {
    try {
      const collection = getFAQCollection(serverId);
      if (!collection) {
        return DEFAULT_FAQS;
      }

      const snapshot = await collection.get();
      const faqs = [];
      
      snapshot.forEach(doc => {
        faqs.push(doc.data());
      });

      // Cache for performance
      this.cache.set(serverId, faqs);
      
      return faqs;
      
    } catch (error) {
      logger.error('Load FAQs error:', error);
      return DEFAULT_FAQS;
    }
  }

  /**
   * Add custom FAQ
   */
  async addFAQ(serverId, question, variations, answer) {
    try {
      const collection = getFAQCollection(serverId);
      if (!collection) {
        // Memory-only
        const faqs = this.cache.get(serverId) || DEFAULT_FAQS;
        faqs.push({ question, variations, answer, isDefault: false });
        this.cache.set(serverId, faqs);
        return true;
      }

      await collection.add({
        question: question.toLowerCase(),
        variations: variations.map(v => v.toLowerCase()),
        answer,
        isDefault: false,
        createdAt: new Date()
      });

      // Invalidate cache
      this.cache.delete(serverId);
      
      return true;
      
    } catch (error) {
      logger.error('Add FAQ error:', error);
      return false;
    }
  }

  /**
   * Get all FAQs for a server
   */
  async getAllFAQs(serverId) {
    return await this.loadFAQs(serverId);
  }
}

module.exports = FAQSystem;
