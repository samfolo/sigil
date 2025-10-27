# Diversity Sampler

Embedding-based diversity sampling for intelligent data analysis.

## Overview

Generates diverse text vignettes from raw data using semantic embeddings. Instead of sending entire datasets to LLMs for analysis, this module selects representative samples that maximise semantic diversity, reducing token costs whilst maintaining analytical coverage.

Uses all-MiniLM-L6-v2 model (384-dimensional embeddings) with local inference via Transformers.js. Farthest-first greedy algorithm selects samples with maximum pairwise cosine distance, ensuring each vignette adds unique information. Supports incremental sampling: request additional diverse samples without reprocessing the full dataset.

Architecture: embedder (all-MiniLM-L6-v2) → chunker (character-based, 200 chars, 10 char overlap) → diversity (cosine distance) → orchestrator. Character-based chunking provides format-agnostic compatibility with CSV, JSON, XML, YAML, and arbitrary text formats.

## Usage

### Initial Sampling

```typescript
import {generateInitialVignettes} from '@sigil/src/agent/definitions/analyser/tools/sampler';
import {isOk} from '@sigil/src/common/errors/result';

const rawData = '...'; // User's uploaded data
const result = await generateInitialVignettes(rawData, 20);

if (isOk(result)) {
  const {vignettes, state} = result.data;
  // Pass vignettes to agent for analysis
  // Store state for incremental requests
}
```

### Requesting Additional Samples

```typescript
import {requestMoreSamples} from '@sigil/src/agent/definitions/analyser/tools/sampler';
import {isOk} from '@sigil/src/common/errors/result';

// Agent calls request_more_samples tool
const result = requestMoreSamples(state, 10);

if (isOk(result)) {
  const {vignettes, hasMore} = result.data;
  // Provide additional vignettes to agent
  // hasMore indicates if more samples available
}
```

### Type Usage

```typescript
import type {Vignette, SamplerState} from '@sigil/src/agent/definitions/analyser/tools/sampler';

const processVignette = (vignette: Vignette): void => {
  console.log(vignette.content); // Text snippet
  console.log(vignette.position); // {start, end} character offsets
  // vignette.embedding available but typically not needed by consumers
};
```

## API Reference

### Functions

#### `generateInitialVignettes`

```typescript
generateInitialVignettes(
  rawData: string,
  count: number
): Promise<Result<InitialVignettesResult, string>>
```

Generates diverse vignettes from raw data. Returns vignettes and state for incremental sampling.

#### `requestMoreSamples`

```typescript
requestMoreSamples(
  state: SamplerState,
  count: number
): Result<MoreSamplesResult, string>
```

Generates additional diverse samples without duplicating previously selected vignettes. Uses state from `generateInitialVignettes`.

### Types

#### `Vignette`

Text snippet with embedding and position metadata.

```typescript
interface Vignette {
  text: string;              // Text snippet
  embedding: number[];       // 384-dimensional vector
  position: VignettePosition;
}
```

#### `VignettePosition`

Character offsets in original data.

```typescript
interface VignettePosition {
  start: number;  // Start offset (inclusive)
  end: number;    // End offset (exclusive)
}
```

#### `SamplerState`

State for incremental sampling. Opaque structure, pass to `requestMoreSamples`.

```typescript
interface SamplerState {
  chunks: Chunk[];
  embeddings: Embedding[];
  selectedIndices: number[];
}
```

#### `InitialVignettesResult`

Result from `generateInitialVignettes`.

```typescript
interface InitialVignettesResult {
  vignettes: Vignette[];
  state: SamplerState;
}
```

#### `MoreSamplesResult`

Result from `requestMoreSamples`.

```typescript
interface MoreSamplesResult {
  vignettes: Vignette[];
  hasMore: boolean;  // True if more samples available
}
```
