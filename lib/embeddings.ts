/**
 * Embedding utilities for session storage
 *
 * Used for storing session embeddings in Supabase.
 * RAG retrieval functionality to be implemented later.
 */

import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error(
    'OPENAI_API_KEY is not configured. Please add it to your environment variables.\n' +
    'Get your API key from: https://platform.openai.com/api-keys'
  );
}

const openai = new OpenAI({apiKey});

/**
 * Generate embeddings using OpenAI's text-embedding-3-small model
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}
