import {beforeEach, describe, expect, it, vi} from 'vitest';

import {generateEmbedding} from './embeddings';

vi.mock('openai', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn(() => ({
      embeddings: {
        create: mockCreate,
      },
    })),
    __mockCreate: mockCreate,
  };
});

vi.stubEnv('OPENAI_API_KEY', 'test-api-key');

describe('generateEmbedding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate embeddings for given text', async () => {
    const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
    const OpenAI = await import('openai');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockCreate = (OpenAI as any).__mockCreate;

    mockCreate.mockResolvedValue({
      data: [{embedding: mockEmbedding}],
    });

    const result = await generateEmbedding('test text');

    expect(mockCreate).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: 'test text',
    });
    expect(result).toEqual(mockEmbedding);
  });

  it('should handle different text inputs', async () => {
    const mockEmbedding = [0.5, 0.6, 0.7];
    const OpenAI = await import('openai');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockCreate = (OpenAI as any).__mockCreate;

    mockCreate.mockResolvedValue({
      data: [{embedding: mockEmbedding}],
    });

    const result = await generateEmbedding('different text input');

    expect(mockCreate).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: 'different text input',
    });
    expect(result).toEqual(mockEmbedding);
  });

  it('should return the first embedding from response', async () => {
    const firstEmbedding = [0.1, 0.2, 0.3];
    const secondEmbedding = [0.4, 0.5, 0.6];
    const OpenAI = await import('openai');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockCreate = (OpenAI as any).__mockCreate;

    mockCreate.mockResolvedValue({
      data: [
        {embedding: firstEmbedding},
        {embedding: secondEmbedding},
      ],
    });

    const result = await generateEmbedding('test');

    expect(result).toEqual(firstEmbedding);
  });
});
