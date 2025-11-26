/**
 * Custom validator for buildRenderTree
 *
 * Validates that generated ComponentSpec can be successfully processed by buildRenderTree.
 * Uses parsed data from the Analyser agent to validate dataSource paths.
 */

import {buildRenderTree} from '@sigil/renderer/core/buildRenderTree';
import {createCustomValidator} from '@sigil/src/agent/framework/validation';
import {isErr} from '@sigil/src/common/errors/result';

import type {GenerateSigilIROutput} from '../types';

/**
 * Options for creating the buildRenderTree validator
 */
interface CreateBuildRenderTreeValidatorOptions {
	/**
	 * Parsed data from Analyser agent for binding validation
	 */
	data: unknown;
}

/**
 * Creates a validator that validates ComponentSpec using buildRenderTree
 *
 * Uses closure pattern to capture parsed data for validation. If buildRenderTree
 * returns errors, throws them for the agent to see and correct.
 */
export const createBuildRenderTreeValidator = (
	options: CreateBuildRenderTreeValidatorOptions
) => createCustomValidator<GenerateSigilIROutput>(
	'build-render-tree',
	'Validates that ComponentSpec structure can be rendered with provided data',
	async (output) => {
		// Add temporary id/created_at for validation
		const completeSpec = {
			...output,
			id: 'temp-validation-id',
			created_at: new Date().toISOString(),
		};

		const result = buildRenderTree(completeSpec, options.data);

		if (isErr(result)) {
			throw result.error;
		}
	}
);
