/**
 * Core render tree builder - transforms ComponentSpec into RenderTree
 */

import type {ComponentSpec} from '@sigil/lib/generated/types/specification';

import {bindData, enrichColumns, extractColumns} from './binding';
import type {RenderTree} from './types';

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
 * @returns RenderTree ready for presentation layer
 * @throws Error if spec structure is invalid or component type is unsupported
 */
export const buildRenderTree = (spec: ComponentSpec, data: unknown[]): RenderTree => {
	// First, narrow the layout type
	const layout = spec.root.layout;

	// Extract first child based on layout type
	let layoutChild;
	switch (layout.type) {
		case 'stack':
			layoutChild = layout.children.at(0);
			break;
		case 'grid':
			layoutChild = layout.children.at(0)?.element;
			break;
		default: {
			const _exhaustive: never = layout;
			throw new Error(`Unknown layout type: ${(_exhaustive as {type: string}).type}`);
		}
	}

	if (!layoutChild) {
		throw new Error('Spec must contain at least one component in layout');
	}

	// Use switch for type narrowing with discriminated union
	switch (layoutChild.type) {
		case 'component': {
			const componentId = layoutChild.component_id;

			// Look up component in nodes registry
			const componentNode = spec.root.nodes[componentId];

			if (!componentNode) {
				throw new Error(`Component "${componentId}" not found in nodes registry`);
			}

			// Use switch for type narrowing on component type
			switch (componentNode.type) {
				case 'data-table': {
					// TypeScript narrows componentNode but we need to assert config type
					if (componentNode.config.type !== 'data-table') {
						throw new Error('Component type and config type mismatch');
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
					return {
						type: 'data-table',
						props: {
							title: config.title,
							description: config.description,
							columns: enrichedColumns,
							data: rows,
						},
					};
				}

				case 'hierarchy':
				case 'composition':
				case 'text-insight':
					throw new Error(`Unsupported component type: ${componentNode.type}`);
			}
		}

		case 'layout':
			throw new Error('Nested layouts not yet supported');

		default: {
			// Exhaustiveness check
			const _exhaustive: never = layoutChild;
			throw new Error(`Unknown layout child type: ${(_exhaustive as {type: string}).type}`);
		}
	}
};
