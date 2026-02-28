/**
 * REDIS SERVICE
 * 
 * Caching layer for semantic cache and rate limiting
 */

const redis = require('redis');
const logger = require('../utils/logger');

let client = null;

/**
 * Initialize Redis connection
 */
async function initializeRedis() {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    client.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    client.on('connect', () => {
      logger.info('🟢 Redis connected');
    });

    await client.connect();
    return client;
    
  } catch (error) {
    logger.error('Redis initialization failed:', error);
    logger.warn('⚠️ Running without cache (performance degraded)');
    return null;
  }
}

/**
 * Get value from cache
 */
async function get(key) {
  if (!client) return null;
  try {
    return await client.get(key);
  } catch (error) {
    logger.error('Redis get error:', error);
    return null;
  }
}

/**
 * Set value in cache
 */
async function set(key, value) {
  if (!client) return false;
  try {
    await client.set(key, value);
    return true;
  } catch (error) {
    logger.error('Redis set error:', error);
    return false;
  }
}

/**
 * Set value with expiration (in seconds)
 */
async function setex(key, seconds, value) {
  if (!client) return false;
  try {
    await client.setEx(key, seconds, value);
    return true;
  } catch (error) {
    logger.error('Redis setex error:', error);
    return false;
  }
}

/**
 * Delete key from cache
 */
async function del(key) {
  if (!client) return false;
  try {
    await client.del(key);
    return true;
  } catch (error) {
    logger.error('Redis del error:', error);
    return false;
  }
}

/**
 * Check if Redis is connected
 */
function isConnected() {
  return client && client.isReady;
}

module.exports = {
  initializeRedis,
  get,
  set,
  setex,
  del,
  isConnected,
  getClient: () => client
};
