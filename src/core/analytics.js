/**
 * ANALYTICS SYSTEM — Owl 🦉
 * 
 * Tracks community health metrics:
 * - Message sentiment (positive/neutral/negative)
 * - Unanswered queries
 * - Top contributors
 * - Activity heatmap (messages per hour)
 * - Milestone celebrations
 */

const { getDB } = require('../services/database');
const logger = require('../utils/logger');

class AnalyticsSystem {
    constructor() {
        // In-memory counters (flushed to Firestore periodically)
        this.hourlyActivity = new Map(); // `${serverId}:${hour}` -> count
        this.sentimentCounts = new Map(); // `${serverId}:${date}` -> { positive, neutral, negative }
        this.unansweredQueries = []; // { serverId, query, timestamp, userId }
        this.topContributors = new Map(); // `${serverId}:${userId}` -> helpfulCount
        this.flushInterval = null;
    }

    /**
     * Start periodic flush to Firestore
     */
    startPeriodicFlush(intervalMs = 300000) { // Every 5 minutes
        this.flushInterval = setInterval(() => {
            this.flush().catch(err => logger.error('Analytics flush error:', err));
        }, intervalMs);
    }

    /**
     * Track a message event
     */
    trackMessage(serverId, classification, source) {
        const now = new Date();
        const hour = now.getHours();
        const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD

        // Activity heatmap
        const activityKey = `${serverId}:${hour}`;
        this.hourlyActivity.set(activityKey, (this.hourlyActivity.get(activityKey) || 0) + 1);

        // Track unanswered queries (fallback responses)
        if (source === 'fallback') {
            // Will be populated by the caller with the actual query
        }
    }

    /**
     * Track sentiment for a message
     * @param {string} serverId
     * @param {string} sentiment - 'positive', 'neutral', or 'negative'
     */
    trackSentiment(serverId, sentiment) {
        const dateKey = new Date().toISOString().split('T')[0];
        const key = `${serverId}:${dateKey}`;

        const counts = this.sentimentCounts.get(key) || { positive: 0, neutral: 0, negative: 0 };
        if (counts[sentiment] !== undefined) {
            counts[sentiment]++;
        }
        this.sentimentCounts.set(key, counts);
    }

    /**
     * Track an unanswered query
     */
    trackUnanswered(serverId, query, userId) {
        this.unansweredQueries.push({
            serverId,
            query: query.slice(0, 200),
            userId,
            timestamp: new Date()
        });

        // Keep only last 100
        if (this.unansweredQueries.length > 100) {
            this.unansweredQueries = this.unansweredQueries.slice(-100);
        }
    }

    /**
     * Track a helpful contribution
     */
    trackContribution(serverId, userId) {
        const key = `${serverId}:${userId}`;
        this.topContributors.set(key, (this.topContributors.get(key) || 0) + 1);
    }

    /**
     * Get analytics summary for a server
     */
    async getSummary(serverId) {
        // Activity heatmap (24 hours)
        const heatmap = [];
        for (let h = 0; h < 24; h++) {
            const key = `${serverId}:${h}`;
            heatmap.push(this.hourlyActivity.get(key) || 0);
        }

        // Today's sentiment
        const todayKey = `${serverId}:${new Date().toISOString().split('T')[0]}`;
        const todaySentiment = this.sentimentCounts.get(todayKey) || { positive: 0, neutral: 0, negative: 0 };

        // Unanswered queries for this server
        const serverUnanswered = this.unansweredQueries.filter(q => q.serverId === serverId);

        // Top contributors for this server
        const contributors = [];
        for (const [key, count] of this.topContributors.entries()) {
            if (key.startsWith(`${serverId}:`)) {
                const userId = key.split(':')[1];
                contributors.push({ userId, count });
            }
        }
        contributors.sort((a, b) => b.count - a.count);

        return {
            heatmap,
            sentiment: todaySentiment,
            unansweredCount: serverUnanswered.length,
            unanswered: serverUnanswered.slice(-5), // Last 5
            topContributors: contributors.slice(0, 5)
        };
    }

    /**
     * Check if a member milestone was reached
     */
    checkMilestone(memberCount) {
        const milestones = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
        return milestones.includes(memberCount);
    }

    /**
     * Flush in-memory data to Firestore
     */
    async flush() {
        const db = getDB();
        if (!db) return;

        try {
            // Flush sentiment data
            for (const [key, data] of this.sentimentCounts.entries()) {
                const [serverId, date] = key.split(':');
                await db.collection('servers').doc(serverId)
                    .collection('analytics').doc(`sentiment_${date}`)
                    .set(data, { merge: true });
            }

            // Flush activity data
            const activityByServer = {};
            for (const [key, count] of this.hourlyActivity.entries()) {
                const [serverId, hour] = key.split(':');
                if (!activityByServer[serverId]) activityByServer[serverId] = {};
                activityByServer[serverId][`hour_${hour}`] = count;
            }

            for (const [serverId, data] of Object.entries(activityByServer)) {
                const today = new Date().toISOString().split('T')[0];
                await db.collection('servers').doc(serverId)
                    .collection('analytics').doc(`activity_${today}`)
                    .set(data, { merge: true });
            }

            logger.info('📊 Analytics flushed to Firestore');

        } catch (error) {
            logger.error('Analytics flush error:', error);
        }
    }

    /**
     * Cleanup on shutdown
     */
    async shutdown() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }
        await this.flush();
    }
}

module.exports = AnalyticsSystem;
