// riasec.utils.ts
// Utility functions for converting RIASEC codes and scores to vectors and calculating cosine similarity for career matching

// RIASEC order: R, I, A, S, E, C
const RIASEC_ORDER = ['R', 'I', 'A', 'S', 'E', 'C'];

// Weights for 3-letter code positions (primary=3, secondary=2, tertiary=1)
const POSITION_WEIGHTS: Record<number, number> = { 0: 3, 1: 2, 2: 1 };

// Convert a 3-letter RIASEC code (e.g., "AES") to a weighted vector
// code - 3-letter RIASEC code
// Returns a 6-element array [R, I, A, S, E, C] with position weights
export function codeToVector(code: string): number[] {

    // Initialize vector with zeros
    const vector = [0, 0, 0, 0, 0, 0];

    // If code is empty or invalid, return zero vector
    if (!code || code.length === 0) return vector;

    // Split the code into individual letters and process each
    code.split('').forEach((char, position) => {

        // Find the index of the character in the RIASEC order (e.g., "R" -> 0, "I" -> 1)
        const index = RIASEC_ORDER.indexOf(char.toUpperCase());

        // If the character is valid and within the first 3 positions, update the vector
        if (index >= 0 && position < 3) {
            // Assign positional weight based on importance
            vector[index] = POSITION_WEIGHTS[position];
        }
    });

    // Return the weighted career vector
    return vector;
}

// Convert user RIASEC scores array to a normalized vector
// scores - Array of {type: string, score: number}
// Returns a normalized 6-element vector
export function scoresToVector(scores: { type: string; score: number }[]): number[] {

    // Initialize vector with zeros
    const vector = [0, 0, 0, 0, 0, 0];

    // Populate the vector using quiz scores
    scores.forEach(s => {

        // Map score type to its vector index (e.g., "A" -> 2)
        const index = RIASEC_ORDER.indexOf(s.type.toUpperCase());

        // If the score type is valid, update the vector
        if (index >= 0) {
            vector[index] = s.score;
        }
    });

    // Calculate vector magnitude (Euclidean length) to normalize the vector to unit length
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));

    // If the magnitude is zero (e.g., all scores are zero), return the raw vector to avoid division by zero
    if (magnitude === 0) return vector;

    // Return the normalized vector so that |vector| = 1
    return vector.map(v => v / magnitude);
}

// Normalize a vector (for career code vectors)
export function normalizeVector(vector: number[]): number[] {

    // Calculate vector magnitude (Euclidean length) to normalize the vector to unit length
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));

    // If the magnitude is zero, return the zero vector
    if (magnitude === 0) return vector;

    // Return the normalized vector
    return vector.map(v => v / magnitude);
}

// Calculate cosine similarity between two vectors
// Returns a value between 0 and 1 (higher = more similar)
export function cosineSimilarity(a: number[], b: number[]): number {

    // Check if vectors are of the same length
    if (a.length !== b.length) return 0;

    // Calculate dot product (a · b)
    const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);

    // Calculate magnitude of both vectors (|a| and |b|)
    const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));

    // Check for zero magnitudes to avoid division by zero
    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    // Return the cosine similarity
    // Formula: (a · b) / (|a| × |b|)
    return dotProduct / (magnitudeA * magnitudeB);
}
