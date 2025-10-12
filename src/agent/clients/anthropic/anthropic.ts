import Anthropic from '@anthropic-ai/sdk';

export interface AnthropicClientConfig {
	apiKey?: string;
}

/**
 * Creates a new Anthropic client instance
 *
 * @param config - Optional configuration object
 * @param config.apiKey - Anthropic API key (defaults to process.env.ANTHROPIC_API_KEY)
 * @returns Fresh Anthropic client instance
 * @throws Error if API key is not provided and not found in environment variables
 */
export const createAnthropicClient = (config?: AnthropicClientConfig): Anthropic => {
	const apiKey = config?.apiKey ?? process.env.ANTHROPIC_API_KEY;

	if (!apiKey) {
		throw new Error(
			'ANTHROPIC_API_KEY is not configured. Please add it to your environment variables.\n' +
			'Get your API key from: https://console.anthropic.com/settings/keys'
		);
	}

	return new Anthropic({apiKey});
};
