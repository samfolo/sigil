import OpenAI from 'openai';

export interface OpenAIClientConfig {
  apiKey?: string;
}

/**
 * Creates a new OpenAI client instance
 *
 * @param config - Optional configuration object
 * @param config.apiKey - OpenAI API key (defaults to process.env.OPENAI_API_KEY)
 * @returns Fresh OpenAI client instance
 * @throws Error if API key is not provided and not found in environment variables
 */
export const createOpenAIClient = (config?: OpenAIClientConfig): OpenAI => {
  const apiKey = config?.apiKey ?? process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not configured. Please add it to your environment variables.\n' +
      'Get your API key from: https://platform.openai.com/api-keys'
    );
  }

  return new OpenAI({apiKey});
};
