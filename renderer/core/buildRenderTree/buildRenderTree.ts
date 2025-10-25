/**
 * Core render tree builder - transforms ComponentSpec into RenderTree
 */

import {ERROR_CODES, err, isErr, ok, type Result, type SpecError} from '@sigil/src/common/errors';
import {generateFieldNameSimilaritySuggestion} from '@sigil/src/common/errors';
import type {ComponentSpec} from '@sigil/src/lib/generated/types/specification';

import {bindData, enrichColumns, extractColumns} from '../binding';
import {VALID_LAYOUT_CHILD_TYPES} from '../constants/constants';
import type {RenderTree, Row} from '../types';
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
 * This function accumulates all structural errors found in the spec rather than
 * failing fast. It returns all issues discovered during processing, though some
 * errors may be dependent (e.g., missing component prevents data binding).
 *
 * @param spec - ComponentSpec from Sigil IR
 * @param data - Raw data array
 * @returns Result containing RenderTree or array of structured errors
 */
export const buildRenderTree = (spec: ComponentSpec, data: unknown[]): Result<RenderTree, SpecError[] | string> => {
  const errors: SpecError[] = [];

  // Extract first child from layout
  const layoutChildResult = extractFirstLayoutChild(spec.root.layout);

  if (!layoutChildResult.success) {
    // Layout extraction failed - cannot proceed with dependent steps
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
        const availableComponents = Object.keys(spec.root.nodes);
        const suggestion = generateFieldNameSimilaritySuggestion(componentId, availableComponents);
        errors.push({
          code: ERROR_CODES.MISSING_COMPONENT,
          severity: 'error',
          category: 'spec',
          path: `$.root.layout.children[0].component_id`,
          context: {componentId, availableComponents},
          suggestion
        });
        // Cannot proceed without component - return accumulated errors
        return err(errors);
      }

      // Use switch for type narrowing on component type
      switch (componentNode.type) {
        case 'data-table': {
          // TypeScript narrows componentNode but we need to assert config type
          if (componentNode.config.type !== 'data-table') {
            errors.push({
              code: ERROR_CODES.TYPE_MISMATCH,
              severity: 'error',
              category: 'spec',
              path: `$.root.nodes['${componentId}']`,
              context: {
                expected: componentNode.type,
                actual: componentNode.config.type,
                nodeId: componentId
              }
            });
            // Cannot proceed with mismatched types - return accumulated errors
            return err(errors);
          }
          const config = componentNode.config;

          // Extract columns from config
          const columns = extractColumns(config.columns);

          // Get accessor_bindings for this component
          const accessorBindings = spec.root.accessor_bindings[componentId] ?? {};

          // Enrich columns with metadata
          const enrichedColumns = enrichColumns(columns, accessorBindings);

          // Bind data to rows with path context
          const bindResult = bindData(data, enrichedColumns, accessorBindings, ['']);

          // Handle binding errors
          let rows: Row[];
          if (isErr(bindResult)) {
            // Accumulate binding errors
            errors.push(...bindResult.error);
            // Use empty array for partial rendering
            rows = [];
          } else {
            rows = bindResult.data;
          }

          // Check if any errors accumulated (spec errors + binding errors)
          if (errors.length > 0) {
            return err(errors);
          }

          // Build RenderTree with successful rows
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
      const childType = (_exhaustive as {type: string}).type;
      const suggestion = generateFieldNameSimilaritySuggestion(childType, [...VALID_LAYOUT_CHILD_TYPES]);
      errors.push({
        code: ERROR_CODES.UNKNOWN_LAYOUT_CHILD_TYPE,
        severity: 'error',
        category: 'spec',
        path: '$.root.layout.children[0]',
        context: {childType, validTypes: [...VALID_LAYOUT_CHILD_TYPES]},
        suggestion
      });
      return err(errors);
    }
  }
};
