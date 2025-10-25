import {createOpenAIClient} from '@sigil/src/agent/clients/openai';

/**
 * Generate embeddings using OpenAI's text-embedding-3-small model
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  const openai = createOpenAIClient();
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}
