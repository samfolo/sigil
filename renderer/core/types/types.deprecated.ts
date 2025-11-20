/**
 * Core renderer types - framework-agnostic data structures
 *
 * These types define the intermediate representation (RenderTree) that bridges
 * the Sigil ComponentSpec and the presentation layer. This separation enables:
 * - Framework-agnostic core logic (testable without React)
 * - Multiple presentation adapters (React, CLI, SSR, etc.)
 * - Debuggable intermediate state
 *
 * Phase 1 Scope:
 * - Only supports data-table component type
 * - No affordances (sorting, pagination, filtering)
 * - No layout processing (renders single component)
 * - Flat data structures only (no nested accessors)
 */

/**
 * RenderTree is the root of the intermediate representation
 *
 * Currently a single RenderNode, but designed to extend to a tree structure
 * in future phases when layout processing is added
 */
export type RenderTree = RenderNode;

/**
 * RenderNode represents a processed component ready for rendering
 *
 * Phase 1: Only data-table type
 * Future: hierarchy, composition, text-insight
 */
export interface RenderNode {
  type: 'data-table';
  props: TableProps;
}

/**
 * TableProps contains all processed data needed to render a data table
 *
 * This is the contract between the core renderer and the presentation layer.
 * All data transformations (value mappings, type coercion, etc.) are complete.
 */
export interface TableProps {
  /** Optional title for the table */
  title?: string;

  /** Optional description explaining the table's purpose */
  description?: string;

  /** Column definitions derived from accessor_bindings */
  columns: Column[];

  /** Processed row data with transformed values */
  data: Row[];
}

/**
 * Column definition derived from FieldMetadata in accessor_bindings
 */
export interface Column {
  /** Field accessor (e.g., "name", "email") */
  id: string;

  /** Display label for the column header */
  label: string;

  /** Primary data type from FieldMetadata.data_types[0] */
  dataType: string;

  /** Horizontal alignment of cell content. Default: 'left' for text, 'right' for numbers */
  alignment?: 'left' | 'center' | 'right';
}

/**
 * Row represents a single data record with unique identification
 */
export interface Row {
  /** Unique identifier for this row (generated from index or hash) */
  id: string;

  /** Cell values keyed by column accessor */
  cells: Record<string, CellValue>;
}

/**
 * CellValue holds both raw and display-transformed values
 *
 * This enables:
 * - Displaying transformed values (e.g., "active" → "Active")
 * - Accessing raw values for sorting, filtering (future phases)
 * - Debugging value transformations
 */
export interface CellValue {
  /** Original value from the data source */
  raw: unknown;

  /** Display value after applying value_mappings and formatting
   * Applies value_mappings first, then format strings for dates/numbers
   */
  display: string;

  /** Optional format string from FieldMetadata (e.g., 'DD/MM/YYYY', '0,0.00') */
  format?: string;

  /** Data type from FieldMetadata for format hint */
  dataType?: string;
}
