import type {Tool, ToolUnion} from '@anthropic-ai/sdk/resources';
import {z} from 'zod';

import {createAnthropicClient} from '@sigil/src/agent/clients/anthropic';
import {buildAnalysisPrompt} from '@sigil/src/agent/prompts';
import type {Result} from '@sigil/src/common/errors/result';
import {err, ok} from '@sigil/src/common/errors/result';
import type {Analysis} from '@sigil/src/common/types/analysisSchema';
import {analysisSchema} from '@sigil/src/common/types/analysisSchema';
import {generateEmbedding} from '@sigil/src/data/embeddings';
import {getSupabaseClient} from '@sigil/src/data/supabase';

type AnalysisError =
  | 'missing_api_key'
  | 'no_tool_use'
  | 'invalid_schema'
  | 'anthropic_error';

export interface AnalysisResult {
  analysis: Analysis;
  sessionId: string | null;
}

const limitDataSample = (data: unknown, _format: string): string => {
  let sample = '';

  if (Array.isArray(data)) {
    const limited = data.slice(0, 10);
    sample = JSON.stringify(limited, null, 2);
  } else {
    sample = JSON.stringify(data, null, 2);
  }

  if (sample.length > 1000) {
    sample = `${sample.substring(0, 1000)}...`;
  }

  return sample;
};

const ANALYSIS_TOOL: ToolUnion = {
  name: 'provide_analysis',
  description:
    'Provide a structured analysis of the data sample including data type, description, key fields, recommended visualisation, and rationale.',
  input_schema: z.toJSONSchema(analysisSchema, {
    target: 'draft-2020-12',
  }) as Tool.InputSchema,
};

/**
 * Analyses data using Claude AI and stores the result in Supabase
 *
 * @param format - The format of the data (e.g., 'csv', 'json')
 * @param data - The data to analyse
 * @returns Result containing analysis and session ID, or error code
 */
export const analyseData = async (
  format: string,
  data: unknown
): Promise<Result<AnalysisResult, AnalysisError>> => {
  const dataSample = limitDataSample(data, format);
  const prompt = buildAnalysisPrompt({format, dataSample});

  let client;
  try {
    client = createAnthropicClient();
  } catch {
    return err('missing_api_key');
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{role: 'user', content: prompt}],
      tools: [ANALYSIS_TOOL],
      tool_choice: {type: 'tool', name: 'provide_analysis'},
    });

    const toolUse = response.content.find((block) => block.type === 'tool_use');

    if (!toolUse || toolUse.type !== 'tool_use') {
      return err('no_tool_use');
    }

    const parseResult = analysisSchema.safeParse(toolUse.input);
    if (!parseResult.success) {
      console.error('Schema validation error:', parseResult.error.issues);
      return err('invalid_schema');
    }

    const analysis = parseResult.data;

    // Generate embedding and store in Supabase
    try {
      const embedding = await generateEmbedding(analysis.description);
      console.log('Generated embedding successfully, length:', embedding.length);

      const supabase = getSupabaseClient();
      const {data: session, error: insertError} = await supabase
        .from('sessions')
        .insert({
          format,
          data,
          analysis,
          embedding,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Failed to store session in Supabase:', {
          error: insertError,
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
        });
        // Continue without session storage - don't fail the analysis
        return ok({analysis, sessionId: null});
      }

      console.log('Session stored successfully:', session.id);
      return ok({analysis, sessionId: session.id});
    } catch (embeddingError) {
      console.error('Failed to generate embedding from OpenAI:', {
        error: embeddingError,
        message:
          embeddingError instanceof Error
            ? embeddingError.message
            : String(embeddingError),
        stack:
          embeddingError instanceof Error ? embeddingError.stack : undefined,
      });
      // Continue without session storage - don't fail the analysis
      return ok({analysis, sessionId: null});
    }
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return err('anthropic_error');
  }
};
