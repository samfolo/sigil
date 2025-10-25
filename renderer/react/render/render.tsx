/**
 * React adapter for Sigil renderer
 *
 * Transforms RenderTree into React elements. This adapter layer enables
 * the framework-agnostic core to be used with React components.
 */

import type {ReactElement} from 'react';

import {buildRenderTree} from '@sigil/renderer/core';
import {SpecProcessingError} from '@sigil/src/common/errors';
import type {ComponentSpec} from '@sigil/src/lib/generated/types/specification';

import {DataTable} from '../components';

/**
 * Renders a ComponentSpec with data as React elements
 *
 * Pipeline:
 * 1. Call buildRenderTree() to get framework-agnostic RenderTree
 * 2. Handle any errors from tree building
 * 3. Switch on RenderNode type
 * 4. Map to appropriate React component
 * 5. Return React element
 *
 * @param spec - ComponentSpec from Sigil IR
 * @param data - Raw data array
 * @returns React element ready to render
 * @throws Error if rendering fails (converts Result errors to exceptions for React error boundaries)
 */
export const render = (spec: ComponentSpec, data: unknown[]): ReactElement => {
  const renderTreeResult = buildRenderTree(spec, data);

  // Convert Result error to exception for React error boundary handling
  if (!renderTreeResult.success) {
    // Handle union type: SpecError[] | string
    if (Array.isArray(renderTreeResult.error)) {
      // Structured errors that model can fix - use SpecProcessingError
      throw new SpecProcessingError(renderTreeResult.error);
    } else {
      // Feature limitation - use plain Error
      throw new Error(`Failed to build render tree: ${renderTreeResult.error}`);
    }
  }

  const renderTree = renderTreeResult.data;

  // Switch on RenderNode type for type narrowing
  switch (renderTree.type) {
    case 'data-table':
      return <DataTable {...renderTree.props} />;

    default:
      throw new Error(`Unknown render node type: ${renderTree.type}`);
  }
};
