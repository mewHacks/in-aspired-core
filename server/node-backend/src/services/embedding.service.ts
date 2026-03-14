// embedding.service.ts — Generates vector embeddings using the Google Generative
// AI SDK. Gracefully falls back to keyword search if embedding generation fails.

import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG } from '../config/env';

// Result of embedding request (with fallback flag)
export interface EmbeddingResult {
    embedding: number[] | null; // The resulting embedding, or null if fallback is used
    usedFallback: boolean; // Fallback in case embedding generation fails
    error?: string;
}

// Simple in-memory cache for embeddings with TTL and size limit
const CACHE_MAX_SIZE = 500;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const embeddingCache = new Map<string, { embedding: number[]; timestamp: number }>();

// Evict expired entries and enforce max size
const cleanupCache = () => {
    const now = Date.now();
    for (const [key, value] of embeddingCache) {
        if (now - value.timestamp > CACHE_TTL_MS) {
            embeddingCache.delete(key);
        }
    }
    // If still over limit, remove oldest entries
    if (embeddingCache.size > CACHE_MAX_SIZE) {
        const keysToDelete = Array.from(embeddingCache.keys()).slice(0, embeddingCache.size - CACHE_MAX_SIZE);
        keysToDelete.forEach(key => embeddingCache.delete(key));
    }
};

// Timeout for embedding generation (5 seconds)
const EMBEDDING_TIMEOUT_MS = 5000;

// Circuit Breaker for Gemini Embedding API to prevent cascading latency when API is down
const CIRCUIT_BREAKER_THRESHOLD = 3;    // Trip after 3 consecutive failures
const CIRCUIT_BREAKER_COOLDOWN_MS = 30000; // 30s cooldown before probe

let circuitFailureCount = 0;
let circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'; // States: CLOSED (normal) → OPEN (fail fast) → HALF_OPEN (probe)
let circuitOpenedAt = 0;

const checkCircuitBreaker = (): boolean => {
    if (circuitState === 'CLOSED') return true; // Allow request

    if (circuitState === 'OPEN') {
        // Check if cooldown has elapsed
        if (Date.now() - circuitOpenedAt >= CIRCUIT_BREAKER_COOLDOWN_MS) {
            circuitState = 'HALF_OPEN';
            console.log('[Embedding] Circuit breaker: HALF_OPEN — allowing probe request');
            return true; // Allow one probe
        }
        return false; // Still in cooldown, fail fast
    }

    // HALF_OPEN — already allowing the probe
    return true;
};

const onCircuitSuccess = () => {
    if (circuitState !== 'CLOSED') {
        console.log('[Embedding] Circuit breaker: CLOSED — API recovered');
    }
    circuitFailureCount = 0;
    circuitState = 'CLOSED';
};

const onCircuitFailure = () => {
    circuitFailureCount++;
    if (circuitFailureCount >= CIRCUIT_BREAKER_THRESHOLD) {
        circuitState = 'OPEN';
        circuitOpenedAt = Date.now();
        console.warn(`[Embedding] Circuit breaker: OPEN — ${circuitFailureCount} consecutive failures. Failing fast for ${CIRCUIT_BREAKER_COOLDOWN_MS / 1000}s`);
    }
};

// Generate vector embedding for text using Gemini embedding model.
// Returns null embedding (with usedFallback=true) if generation fails.
// Uses a circuit breaker to fail fast when the API is down.
export const generateEmbedding = async (text: string): Promise<EmbeddingResult> => {

    // Check if text is empty 
    if (!text || text.trim().length === 0) {
        return { embedding: null, usedFallback: true, error: 'Empty text provided' };
    }

    // Truncate to max 1000 characters
    const truncatedText = text.trim().slice(0, 1000);

    // Check cache first
    if (embeddingCache.has(truncatedText)) {
        const cached = embeddingCache.get(truncatedText)!;
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            console.log('[Embedding] Cache hit');
            return { embedding: cached.embedding, usedFallback: false };
        } else {
            embeddingCache.delete(truncatedText); // Expired
        }
    }

    // Circuit breaker: fail fast if API is known to be down
    if (!checkCircuitBreaker()) {
        console.warn('[Embedding] Circuit breaker OPEN — returning fallback immediately');
        return { embedding: null, usedFallback: true, error: 'Circuit breaker open (API unavailable)' };
    }

    try {
        // Guard: no API key configured
        if (!CONFIG.GEMINI_API_KEY) {
            return { embedding: null, usedFallback: true, error: 'GEMINI_API_KEY not configured' };
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS);

        // Initialize Gemini and generate embedding
        const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

        const result = await model.embedContent(truncatedText);
        clearTimeout(timeoutId);

        // gemini-embedding-001 outputs 3072 dims by default.
        // Truncate to 768 for MongoDB vector index compatibility.
        // This is valid because the model uses Matryoshka Representation Learning (MRL),
        // where the first N dimensions form a meaningful embedding.
        const fullEmbedding = result.embedding.values;
        const embedding = fullEmbedding.slice(0, 768);

        // Validate dimensions
        if (!embedding || !Array.isArray(embedding) || embedding.length !== 768) {
            console.warn('[Embedding] Invalid embedding dimensions:', embedding?.length);
            onCircuitFailure();
            return { embedding: null, usedFallback: true, error: 'Invalid embedding dimensions' };
        }

        // Cache the result
        cleanupCache();
        embeddingCache.set(truncatedText, { embedding, timestamp: Date.now() });

        // Success — reset circuit breaker
        onCircuitSuccess();

        return { embedding, usedFallback: false };

    } catch (error: any) {

        // Track failure for circuit breaker
        onCircuitFailure();

        // Handle timeout
        if (error.name === 'AbortError') {
            console.warn('[Embedding] Timeout after', EMBEDDING_TIMEOUT_MS, 'ms');
            return { embedding: null, usedFallback: true, error: 'Timeout' };
        }

        // Handle other errors (API unavailable, quota exceeded, etc.)
        console.warn('[Embedding] Generation failed:', error.message);
        return { embedding: null, usedFallback: true, error: error.message };
    }
};

// Build MongoDB $vectorSearch aggregation stage for semantic course/career search.
export const buildVectorSearchStage = (
    embedding: number[], // The query vector
    indexName: string = 'vector_index', // Default vector search index name
    path: string = 'vectorEmbedding', // Default document field containing embeddings
    limit: number = 5, // Default number of results to return
    numCandidates: number = 100 // Default number of candidates to consider internally
) => {
    return {
        $vectorSearch: {
            index: indexName,
            path: path,
            queryVector: embedding,
            numCandidates: numCandidates,
            limit: limit
        }
    };
};

// Export service object
export const embeddingService = {
    generateEmbedding,
    buildVectorSearchStage
};
