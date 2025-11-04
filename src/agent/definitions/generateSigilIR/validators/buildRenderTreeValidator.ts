/**
 * Custom validator for buildRenderTree
 *
 * Validates that generated ComponentSpec can be successfully processed by buildRenderTree.
 * Uses empty data array for validation since we only care about spec structure correctness,
 * not actual data binding.
 */

import {createCustomValidator} from '@sigil/src/agent/framework/validation';
import {isErr} from '@sigil/src/common/errors/result';
import {buildRenderTree} from '@sigil/renderer/core/buildRenderTree';

import type {GenerateSigilIROutput} from '../types';

/**
 * Validates ComponentSpec using buildRenderTree
 *
 * Creates a validator that calls buildRenderTree with the generated spec and empty
 * data array. If buildRenderTree returns errors, throws them for the agent to see
 * and correct.
 */
export const createBuildRenderTreeValidator = () => createCustomValidator<GenerateSigilIROutput>(
		'build-render-tree',
		'Validates that ComponentSpec structure can be rendered',
		async (output) => {
			// Add temporary id/created_at for validation
			const completeSpec = {
				...output,
				id: 'temp-validation-id',
				created_at: new Date().toISOString(),
			};

			const result = buildRenderTree(completeSpec, []);

			if (isErr(result)) {
				throw result.error;
			}
		}
	);
