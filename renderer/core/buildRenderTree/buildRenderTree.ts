/**
 * Core render tree builder - transforms ComponentSpec into RenderTree
 */

import {err, ok, type Result} from '@sigil/src/common/errors/result';
import type {ComponentSpec} from '@sigil/src/lib/generated/types/specification';

import {bindData, enrichColumns, extractColumns} from '../binding';
import type {RenderTree} from '../types';
import {extractFirstLayoutChild} from '../utils/layout';

/**
 * Builds a RenderTree from ComponentSpec and raw data
 *
 * Processing pipeline:
 * 1. Navigate layout to find component reference
 * 2. Look up component in nodes registry
 * 3. Switch on component type for type narrowing
 * 4. Extract columns from config
 * 5. Get accessor_bindings for component
 * 6. Enrich columns with metadata
 * 7. Bind data to rows
 * 8. Return RenderTree
 *
 * @param spec - ComponentSpec from Sigil IR
 * @param data - Raw data array
 * @returns Result containing RenderTree or error message
 */
export const buildRenderTree = (spec: ComponentSpec, data: unknown[]): Result<RenderTree, string> => {
	// Extract first child from layout
	const layoutChildResult = extractFirstLayoutChild(spec.root.layout);

	if (!layoutChildResult.success) {
		return layoutChildResult;
	}

	const layoutChild = layoutChildResult.data;

	// Use switch for type narrowing with discriminated union
	switch (layoutChild.type) {
		case 'component': {
			const componentId = layoutChild.component_id;

			// Look up component in nodes registry
			const componentNode = spec.root.nodes[componentId];

			if (!componentNode) {
				return err(`Component "${componentId}" not found in nodes registry`);
			}

			// Use switch for type narrowing on component type
			switch (componentNode.type) {
				case 'data-table': {
					// TypeScript narrows componentNode but we need to assert config type
					if (componentNode.config.type !== 'data-table') {
						return err('Component type and config type mismatch');
					}
					const config = componentNode.config;

					// Extract columns from config
					const columns = extractColumns(config.columns);

					// Get accessor_bindings for this component
					const accessorBindings = spec.root.accessor_bindings[componentId] ?? {};

					// Enrich columns with metadata
					const enrichedColumns = enrichColumns(columns, accessorBindings);

					// Bind data to rows
					const rows = bindData(data, enrichedColumns, accessorBindings);

					// Build RenderTree
					return ok({
						type: 'data-table',
						props: {
							title: config.title,
							description: config.description,
							columns: enrichedColumns,
							data: rows,
						},
					});
				}

				case 'hierarchy':
				case 'composition':
				case 'text-insight':
					return err(`Unsupported component type: ${componentNode.type}`);
			}
		}

		case 'layout':
			return err('Nested layouts not yet supported');

		default: {
			// Exhaustiveness check
			const _exhaustive: never = layoutChild;
			return err(`Unknown layout child type: ${(_exhaustive as {type: string}).type}`);
		}
	}
};
