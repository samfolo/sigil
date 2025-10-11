/**
 * Sigil Renderer - Public API
 *
 * Framework-agnostic renderer for Sigil ComponentSpec IR.
 * Exports both the React adapter and core utilities.
 */

// React adapter (main entry point)
export {render} from './frontends/react';

// Core utilities (for testing and advanced usage)
export {buildRenderTree, bindData, enrichColumns, extractColumns} from './core';
export type {CellValue, Column, RenderNode, RenderTree, Row, TableProps} from './core';
