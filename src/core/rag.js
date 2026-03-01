/**
 * RAG KNOWLEDGE BASE SYSTEM
 * 
 * Multi-tenant Retrieval-Augmented Generation
 * - Chunks documents into ~500-token segments
 * - Generates embeddings via Gemini text-embedding-004
 * - Stores in Firestore with strict serverId isolation
 * - Cosine similarity search at query time
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getDB } = require('../services/database');
const logger = require('../utils/logger');

class RAGSystem {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
        this.chunkCache = new Map(); // serverId -> chunks[] (in-memory cache)
    }

    /**
     * Ingest a document: chunk it, embed it, store it
     * @param {string} serverId - Discord server ID (strict isolation)
     * @param {string} content - Raw text content of the document
     * @param {string} filename - Original filename for reference
     * @returns {object} - { success, chunksStored }
     */
    async ingestDocument(serverId, content, filename = 'unknown') {
        try {
            logger.info(`📄 Ingesting document "${filename}" for server ${serverId} (${content.length} chars)`);

            // 1. Chunk the document
            const chunks = this.chunkText(content, 500);
            logger.info(`  → Split into ${chunks.length} chunks`);

            // 2. Generate embeddings for each chunk
            const embeddedChunks = [];
            for (let i = 0; i < chunks.length; i++) {
                try {
                    const embedding = await this.generateEmbedding(chunks[i]);
                    embeddedChunks.push({
                        text: chunks[i],
                        embedding,
                        chunkIndex: i,
                        filename,
                        serverId,
                        createdAt: new Date()
                    });
                } catch (embErr) {
                    logger.error(`  → Failed to embed chunk ${i}:`, embErr.message);
                }
            }

            // 3. Store in Firestore (strictly under this serverId)
            const db = getDB();
            if (!db) {
                // Fallback to in-memory cache
                const existing = this.chunkCache.get(serverId) || [];
                this.chunkCache.set(serverId, [...existing, ...embeddedChunks]);
                logger.info(`  → Stored ${embeddedChunks.length} chunks in memory (no DB)`);
                return { success: true, chunksStored: embeddedChunks.length };
            }

            const batch = db.batch();
            const knowledgeRef = db.collection('servers').doc(serverId).collection('knowledge');

            for (const chunk of embeddedChunks) {
                const docRef = knowledgeRef.doc();
                batch.set(docRef, chunk);
            }

            await batch.commit();
            logger.info(`  → Stored ${embeddedChunks.length} chunks in Firestore`);

            // Invalidate cache
            this.chunkCache.delete(serverId);

            return { success: true, chunksStored: embeddedChunks.length };

        } catch (error) {
            logger.error('RAG ingest error:', error);
            return { success: false, chunksStored: 0 };
        }
    }

    /**
     * Search the knowledge base for a query
     * Strictly isolated to the given serverId
     * @param {string} query - User's question
     * @param {string} serverId - Server to search within
     * @param {number} topK - Number of top results to return
     * @returns {string[]} - Array of relevant text chunks
     */
    async search(query, serverId, topK = 3) {
        try {
            // Generate embedding for the query
            const queryEmbedding = await this.generateEmbedding(query);

            // Get all chunks for this server
            const chunks = await this.getServerChunks(serverId);

            if (chunks.length === 0) {
                return [];
            }

            // Calculate cosine similarity for each chunk
            const scored = chunks.map(chunk => ({
                text: chunk.text,
                filename: chunk.filename,
                score: this.cosineSimilarity(queryEmbedding, chunk.embedding)
            }));

            // Sort by similarity (highest first) and take top K
            scored.sort((a, b) => b.score - a.score);
            const topResults = scored.slice(0, topK);

            // Only return results above a minimum threshold
            const threshold = 0.3;
            const relevant = topResults.filter(r => r.score >= threshold);

            logger.info(`RAG search for "${query.slice(0, 40)}..." in server ${serverId}: ${relevant.length}/${chunks.length} relevant chunks (top score: ${topResults[0]?.score?.toFixed(3)})`);

            return relevant.map(r => r.text);

        } catch (error) {
            logger.error('RAG search error:', error);
            return [];
        }
    }

    /**
     * Get all knowledge chunks for a server
     */
    async getServerChunks(serverId) {
        // Check in-memory cache first
        if (this.chunkCache.has(serverId)) {
            return this.chunkCache.get(serverId);
        }

        const db = getDB();
        if (!db) return [];

        try {
            // STRICT ISOLATION: Only query this server's collection
            const snapshot = await db.collection('servers').doc(serverId).collection('knowledge').get();
            const chunks = [];

            snapshot.forEach(doc => {
                chunks.push(doc.data());
            });

            // Cache for performance
            this.chunkCache.set(serverId, chunks);

            return chunks;

        } catch (error) {
            logger.error('Get server chunks error:', error);
            return [];
        }
    }

    /**
     * Generate text embedding via Gemini
     */
    async generateEmbedding(text) {
        const result = await this.embeddingModel.embedContent(text);
        return result.embedding.values;
    }

    /**
     * Chunk text into segments of approximately maxTokens words
     */
    chunkText(text, maxTokens = 500) {
        const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 0);
        const chunks = [];
        let currentChunk = '';

        for (const sentence of sentences) {
            const trimmed = sentence.trim();
            const combined = currentChunk ? `${currentChunk}. ${trimmed}` : trimmed;

            // Approximate token count (1 token ≈ 4 chars)
            if (combined.length > maxTokens * 4 && currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = trimmed;
            } else {
                currentChunk = combined;
            }
        }

        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    /**
     * Cosine similarity between two vectors
     */
    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        return denominator === 0 ? 0 : dotProduct / denominator;
    }

    /**
     * Get stats for a server's knowledge base
     */
    async getStats(serverId) {
        const chunks = await this.getServerChunks(serverId);
        const filenames = [...new Set(chunks.map(c => c.filename))];

        return {
            totalChunks: chunks.length,
            documents: filenames.length,
            filenames
        };
    }

    /**
     * Clear all knowledge for a server
     */
    async clearKnowledge(serverId) {
        try {
            const db = getDB();
            if (!db) {
                this.chunkCache.delete(serverId);
                return true;
            }

            const snapshot = await db.collection('servers').doc(serverId).collection('knowledge').get();
            const batch = db.batch();
            snapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            this.chunkCache.delete(serverId);
            logger.info(`Cleared knowledge base for server ${serverId}`);
            return true;

        } catch (error) {
            logger.error('Clear knowledge error:', error);
            return false;
        }
    }
}

module.exports = RAGSystem;
