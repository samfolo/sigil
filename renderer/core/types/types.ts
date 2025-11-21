/**
 * Core renderer types - framework-agnostic data structures
 *
 * These types define the intermediate representation (RenderTree) that bridges
 * the Sigil ComponentSpec and the presentation layer. This separation enables:
 * - Framework-agnostic core logic (testable without React)
 * - Multiple presentation adapters (React, CLI, SSR, etc.)
 * - Debuggable intermediate state
 *
 * Version 2 Scope:
 * - Supports layout structures (stacks and grids)
 * - Recursive tree processing
 * - data-table component type (Phase 1)
 * - No affordances yet (sorting, pagination, filtering)
 */

import type {
	LayoutNodeSpacing,
	Padding,
	SizeConstraint,
	StackLayoutNodeAlignment,
} from '@sigil/src/lib/generated/types/specification';

/**
 * RenderTree is the root of the intermediate representation
 *
 * Discriminated union supporting both layout containers and leaf components.
 * Enables recursive tree structures for complex UIs.
 */
export type RenderTree = RenderLayout | RenderComponent;

/**
 * RenderLayout represents processed layout nodes ready for rendering
 *
 * Discriminated union of layout types with fully resolved children.
 * Layout resolution and child processing complete - renderer just walks the tree.
 */
export type RenderLayout = RenderHorizontalStackLayout | RenderVerticalStackLayout | RenderGridLayout;

/**
 * RenderComponent represents processed components ready for rendering
 *
 * Discriminated union of all component types.
 */
export type RenderComponent = RenderDataTable | RenderHierarchy | RenderComposition | RenderTextInsight;

/**
 * Common size constraint fields for layout nodes
 *
 * All constraints are optional and work together:
 * - width/height: preferred size
 * - min_width/min_height: minimum bounds
 * - max_width/max_height: maximum bounds
 *
 * The rendering engine calculates final size based on constraints and content.
 */
export interface SizeConstraints {
	/**
	 * Preferred width of the element
	 */
	width?: SizeConstraint;

	/**
	 * Preferred height of the element
	 */
	height?: SizeConstraint;

	/**
	 * Minimum width constraint
	 */
	min_width?: SizeConstraint;

	/**
	 * Maximum width constraint
	 */
	max_width?: SizeConstraint;

	/**
	 * Minimum height constraint
	 */
	min_height?: SizeConstraint;

	/**
	 * Maximum height constraint
	 */
	max_height?: SizeConstraint;
}

/**
 * Horizontal stack layout - arranges children left-to-right
 */
export interface RenderHorizontalStackLayout extends SizeConstraints {
	/**
	 * Discriminator for horizontal stack layouts
	 */
	type: 'horizontal-stack';

	/**
	 * Spacing between children
	 */
	spacing: LayoutNodeSpacing;

	/**
	 * Alignment of children along the vertical (cross) axis
	 */
	vertical_alignment?: StackLayoutNodeAlignment;

	/**
	 * Padding around the stack's content
	 */
	padding?: Padding;

	/**
	 * Processed children ready for rendering
	 */
	children: RenderTree[];
}

/**
 * Vertical stack layout - arranges children top-to-bottom
 */
export interface RenderVerticalStackLayout extends SizeConstraints {
	/**
	 * Discriminator for vertical stack layouts
	 */
	type: 'vertical-stack';

	/**
	 * Spacing between children
	 */
	spacing: LayoutNodeSpacing;

	/**
	 * Alignment of children along the horizontal (cross) axis
	 */
	horizontal_alignment?: StackLayoutNodeAlignment;

	/**
	 * Padding around the stack's content
	 */
	padding?: Padding;

	/**
	 * Processed children ready for rendering
	 */
	children: RenderTree[];
}

/**
 * Grid layout - arranges children in rows and columns
 *
 * Supports both auto-flow (children placed automatically) and explicit
 * positioning (using column_start/row_start on RenderGridChild).
 */
export interface RenderGridLayout extends SizeConstraints {
	/**
	 * Discriminator for grid layouts
	 */
	type: 'grid';

	/**
	 * Number of columns in the grid
	 */
	columns: number;

	/**
	 * Optional number of rows (auto-flow if omitted)
	 */
	rows?: number;

	/**
	 * Gap between columns
	 */
	column_gap?: LayoutNodeSpacing;

	/**
	 * Gap between rows
	 */
	row_gap?: LayoutNodeSpacing;

	/**
	 * Padding around the grid's content
	 */
	padding?: Padding;

	/**
	 * Grid children with optional positioning
	 */
	children: RenderGridChild[];
}

/**
 * A child within a grid layout with optional positioning and spanning
 *
 * Positioning modes:
 * - Auto-flow (default): Omit column_start and row_start
 * - Explicit: Set column_start and row_start for specific placement
 *
 * Grid coordinates are 1-indexed (first column is 1, not 0).
 */
export interface RenderGridChild {
	/**
	 * Processed child element ready for rendering
	 */
	element: RenderTree;

	/**
	 * Explicit column position (1-indexed). Omit for auto-flow
	 */
	column_start?: number;

	/**
	 * Explicit row position (1-indexed). Omit for auto-flow
	 */
	row_start?: number;

	/**
	 * Number of columns this child spans. Default: 1
	 */
	column_span?: number;

	/**
	 * Number of rows this child spans. Default: 1
	 */
	row_span?: number;
}

/**
 * Data table component with processed props
 */
export interface RenderDataTable {
	/**
	 * Discriminator for data table components
	 */
	type: 'data-table';

	/**
	 * Processed table properties
	 */
	props: TableProps;
}

/**
 * Hierarchy component with processed props
 */
export interface RenderHierarchy {
	/**
	 * Discriminator for hierarchy components
	 */
	type: 'hierarchy';

	/**
	 * Processed hierarchy properties
	 */
	props: Record<string, never>;
}

/**
 * Composition component with processed props
 */
export interface RenderComposition {
	/**
	 * Discriminator for composition components
	 */
	type: 'composition';

	/**
	 * Processed composition properties
	 */
	props: Record<string, never>;
}

/**
 * Text insight component with processed props
 */
export interface RenderTextInsight {
	/**
	 * Discriminator for text insight components
	 */
	type: 'text-insight';

	/**
	 * Processed text insight properties
	 */
	props: Record<string, never>;
}

/**
 * TableProps contains all processed data needed to render a data table
 *
 * This is the contract between the core renderer and the presentation layer.
 * All data transformations (value mappings, type coercion, etc.) are complete.
 */
export interface TableProps {
	/**
	 * Optional title for the table
	 */
	title?: string;

	/**
	 * Optional description explaining the table's purpose
	 */
	description?: string;

	/**
	 * Column definitions derived from accessor_bindings
	 */
	columns: Column[];

	/**
	 * Processed row data with transformed values
	 */
	data: Row[];
}

/**
 * Column definition derived from FieldMetadata in accessor_bindings
 */
export interface Column {
	/**
	 * Field accessor (e.g., "name", "email")
	 */
	id: string;

	/**
	 * Display label for the column header
	 */
	label: string;

	/**
	 * Primary data type from FieldMetadata.data_types[0]
	 */
	dataType: string;

	/**
	 * Horizontal alignment of cell content. Default: 'left' for text, 'right' for numbers
	 */
	alignment?: 'left' | 'center' | 'right';
}

/**
 * Row represents a single data record with unique identification
 */
export interface Row {
	/**
	 * Unique identifier for this row (generated from index or hash)
	 */
	id: string;

	/**
	 * Cell values keyed by column accessor
	 */
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
	/**
	 * Original value from the data source
	 */
	raw: unknown;

	/**
	 * Display value after applying value_mappings and formatting.
	 * Applies value_mappings first, then format strings for dates/numbers
	 */
	display: string;

	/**
	 * Optional format string from FieldMetadata (e.g., 'DD/MM/YYYY', '0,0.00')
	 */
	format?: string;

	/**
	 * Data type from FieldMetadata for format hint
	 */
	dataType?: string;
}
