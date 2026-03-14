# MongoDB Atlas Vector Search Setup

## Overview

This guide covers setting up vector search for both the **courses** and **careers** collections in MongoDB Atlas, enabling semantic search powered by Gemini embeddings.

## Prerequisites

1. MongoDB Atlas cluster (M10+ tier required for vector search)
2. Node.js with dependencies installed (`npm install` in `server/node-backend/`)
3. `.env` configured with:
   - `MONGODB_URI` — your Atlas connection string
   - `GEMINI_API_KEY` — Google Generative AI API key

## Quick Start (Automated)

The fastest way to get vector search running end-to-end:

```bash
cd server/node-backend

# Step 1: Create vector search indexes on both collections
npx ts-node src/scripts/setup-vector-search.ts

# Step 2: Backfill embeddings for courses missing them
npx ts-node src/scripts/backfill-embeddings.ts

# Step 3: Backfill embeddings for careers missing them
npx ts-node src/scripts/backfill-career-embeddings.ts
```

Wait a few minutes after Step 1 for Atlas to build the indexes (check status in your Atlas dashboard under **Database > Search Indexes**). Steps 2 and 3 can run while the indexes are building.

---

## Manual Setup (Atlas UI)

If the automated script does not work (e.g., older driver, local MongoDB), you can create indexes manually.

### Courses Index

1. Go to your MongoDB Atlas dashboard
2. Navigate to your cluster → **Collections** → `courses`
3. Click the **Search Indexes** tab → **Create Search Index**
4. Select **Vector Search** type
5. Set index name to `vector_index`
6. Paste the JSON from `server/node-backend/src/config/vector-search-index.json`

### Careers Index

1. Same as above, but navigate to the `careers` collection
2. Set index name to `vector_index`
3. Paste the JSON from `server/node-backend/src/config/career-vector-search-index.json`

---

## How It Works

### Embedding Generation

- **Model**: `gemini-embedding-001` via the Google Generative AI SDK
- **Native output**: 3072 dimensions
- **Truncated to**: 768 dimensions (valid because the model uses Matryoshka Representation Learning — the first N dimensions form a meaningful embedding)
- **Service**: `server/node-backend/src/services/embedding.service.ts`
  - In-memory cache (500 entries, 10-min TTL)
  - Circuit breaker (trips after 3 failures, 30s cooldown)
  - 5-second timeout per request

### Automatic Embedding on Save

Both the `Course` and `Career` Mongoose models have `pre('save')` hooks that automatically generate vector embeddings when relevant fields are modified:

| Model  | Trigger fields              | Embedded text                                                       |
|--------|-----------------------------|---------------------------------------------------------------------|
| Course | `title`, `description`      | `"{title}. {description} Offered by {institutionId}."`              |
| Career | `name`, `description`, `skills` | `"{name}. {description} Skills: {skills}. Industry: {industry}."` |

**Important**: The admin update endpoints (`PUT /api/courses/:id` and `PUT /api/careers/:id`) use `findOne()` + `save()` to ensure the pre-save hooks fire and embeddings are regenerated when content changes.

### Vector Search Pipeline

Both models expose a static `vectorSearch(query, limit?, filters?)` method that:

1. Generates an embedding for the query text
2. Runs a `$vectorSearch` aggregation stage against the `vector_index` index
3. Filters out archived documents (`isArchived: { $ne: true }`)
4. Returns results sorted by cosine similarity score

### Index Configuration

| Collection | Config File                                  | Key Filter Fields                                              |
|------------|----------------------------------------------|----------------------------------------------------------------|
| courses    | `src/config/vector-search-index.json`        | `level`, `type`, `cost_level`, `domainIds`, `institutionId`    |
| careers    | `src/config/career-vector-search-index.json` | `demand_level`, `job_type`, `education_level_required`, `industry`, `riasec_code` |

---

## Backfill Scripts

### Backfill Course Embeddings

Generates embeddings for all courses that are missing them:

```bash
cd server/node-backend
npx ts-node src/scripts/backfill-embeddings.ts
```

### Backfill Career Embeddings

Generates embeddings for all careers that are missing them:

```bash
cd server/node-backend
npx ts-node src/scripts/backfill-career-embeddings.ts
```

Both scripts include a 1-second delay between API calls to respect Gemini rate limits.

---

## Troubleshooting

### Index Not Ready

After creation, MongoDB Atlas needs a few minutes to build the HNSW index. Check your Atlas dashboard — the index status should show "Active" before queries will work.

### "CommandNotSupported" Error

You are likely running a local MongoDB instance or a shared-tier Atlas cluster. Vector search requires Atlas M10+ tier.

### Performance Tuning

- `numCandidates` is set to 100 in the model static methods. MongoDB recommends 10-20x the limit for better recall.
- Use filter fields (e.g., `level`, `demand_level`) in the vector search stage to reduce the search space.
- Monitor your Atlas tier's performance limits in the Atlas dashboard.

### Embeddings Not Updating on Edit

If vector embeddings are stale after editing a course or career, ensure:

1. The admin update endpoints use `findOne()` + `save()` (not `findOneAndUpdate`), so Mongoose pre-save hooks fire.
2. The Gemini API key is valid and the circuit breaker is not tripped (check server logs for `[Embedding] Circuit breaker: OPEN`).
