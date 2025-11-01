/**
 * Zod schemas and types for common parser structures
 *
 * Single source of truth for parser result types and metadata structures.
 * Generic types remain as TypeScript interfaces since Zod doesn't support generics.
 */

import {z} from 'zod';

/**
 * Indicates failure to parse or validate data
 *
 * Shared failure type used by all parsers
 */
export const ParserFailureSchema = z.object({
	/**
	 * Indicates parsing or validation failure
	 */
	valid: z.literal(false).describe('Indicates parsing or validation failure'),

	/**
	 * Error message describing the failure
	 */
	error: z.string().describe('Error message describing the failure'),
});

export type ParserFailure = z.infer<typeof ParserFailureSchema>;

/**
 * Creates a schema for parser structure metadata details
 *
 * Discriminated union on the `valid` field:
 * - `{valid: false}` indicates parsing or validation failure
 * - `{valid: true}` indicates successful parse with metadata
 *
 * @param metadataSchema - Zod schema for the metadata type
 */
export const parserStructureMetadataDetailsSchema = <MetadataType extends z.ZodTypeAny>(metadataSchema: MetadataType) =>
	z.discriminatedUnion('valid', [
		ParserFailureSchema,
		z.object({
			valid: z.literal(true),
			metadata: metadataSchema,
		}),
	]);

/**
 * Creates a schema for parser results including parsed data
 *
 * Used as the return type for parser implementations.
 * Includes parsedData which is stored separately in state.run.parsedData
 *
 * @param dataSchema - Zod schema for the parsed data type
 * @param metadataSchema - Zod schema for the metadata type
 */
export const parserResultSchema = <DataType extends z.ZodTypeAny, MetadataType extends z.ZodTypeAny>(
	dataSchema: DataType,
	metadataSchema: MetadataType
) =>
		z.discriminatedUnion('valid', [
			ParserFailureSchema,
			z.object({
				valid: z.literal(true),
				parsedData: dataSchema,
				metadata: metadataSchema,
			}),
		]);
