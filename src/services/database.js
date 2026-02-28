/**
 * DATABASE SERVICE
 * 
 * Firebase/Firestore for persistent data storage
 */

const admin = require('firebase-admin');
const logger = require('../utils/logger');

let db = null;

/**
 * Initialize Firebase Admin
 */
async function initializeDatabase() {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      db = admin.firestore();
      return db;
    }

    // Initialize with credentials
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      })
    });

    db = admin.firestore();
    
    logger.info('🟢 Firebase initialized');
    return db;
    
  } catch (error) {
    logger.error('Firebase initialization failed:', error);
    logger.warn('⚠️ Running without database (features limited)');
    return null;
  }
}

/**
 * Get Firestore instance
 */
function getDB() {
  return db;
}

/**
 * Server configuration collection
 */
function getServerConfig(serverId) {
  if (!db) return null;
  return db.collection('servers').doc(serverId);
}

/**
 * User history collection
 */
function getUserHistory(userId) {
  if (!db) return null;
  return db.collection('users').doc(userId).collection('history');
}

/**
 * FAQ collection
 */
function getFAQCollection(serverId) {
  if (!db) return null;
  return db.collection('servers').doc(serverId).collection('faqs');
}

/**
 * Usage tracking collection
 */
function getUsageCollection() {
  if (!db) return null;
  return db.collection('usage');
}

/**
 * Save server configuration
 */
async function saveServerConfig(serverId, config) {
  if (!db) return false;
  try {
    await db.collection('servers').doc(serverId).set(config, { merge: true });
    return true;
  } catch (error) {
    logger.error('Save server config error:', error);
    return false;
  }
}

/**
 * Get server configuration
 */
async function getServerConfig(serverId) {
  if (!db) return null;
  try {
    const doc = await db.collection('servers').doc(serverId).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    logger.error('Get server config error:', error);
    return null;
  }
}

module.exports = {
  initializeDatabase,
  getDB,
  getServerConfig,
  getUserHistory,
  getFAQCollection,
  getUsageCollection,
  saveServerConfig,
  getServerConfig
};
