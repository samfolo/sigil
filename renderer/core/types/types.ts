/**
 * Core renderer types - framework-agnostic data structures
 *
 * These types define the intermediate representation (RenderTree) that bridges
 * the Sigil ComponentSpec and the presentation layer. This separation enables:
 * - Framework-agnostic core logic (testable without React)
 * - Multiple presentation adapters (React, CLI, SSR, etc.)
 * - Debuggable intermediate state
 *
 * Supports layout structures (stacks and grids) and recursive tree processing.
 * Component types include data-table, hierarchy, composition, text-insight, and text.
 */

import type {
	DataTableColumn,
	DataTableConfig,
	HorizontalStackLayoutNode,
	LayoutNodeSpacing,
	Padding,
	StackLayoutNodeAlignment,
	TextConfig,
} from '@sigil/src/lib/generated/types/specification';

/**
 * Formatted value type for text display
 *
 * Null/undefined pass through from original data values, allowing renderers
 * to decide presentation (placeholder UI, empty string, etc.).
 */
export type FormattedValue = string | null | undefined;

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
export type RenderComponent = RenderDataTable | RenderHierarchy | RenderComposition | RenderTextInsight | RenderText;

/**
 * Common size constraint fields for layout nodes
 *
 * Derived from spec layout node size properties. All constraints are optional
 * and work together to define layout bounds.
 */
export type SizeConstraints = Pick<
	HorizontalStackLayoutNode,
	'width' | 'height' | 'min_width' | 'max_width' | 'min_height' | 'max_height'
>;

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
	 * Component ID from spec.root.nodes
	 * Used to look up configuration and bindings during rendering
	 */
	componentId?: string;

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
	 * Component ID from spec.root.nodes
	 * Used to look up configuration and bindings during rendering
	 */
	componentId?: string;

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
	 * Component ID from spec.root.nodes
	 * Used to look up configuration and bindings during rendering
	 */
	componentId?: string;

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
	 * Component ID from spec.root.nodes
	 * Used to look up configuration and bindings during rendering
	 */
	componentId?: string;

	/**
	 * Processed text insight properties
	 */
	props: Record<string, never>;
}

/**
 * Text primitive component with processed props
 */
export interface RenderText {
	/**
	 * Discriminator for text primitive components
	 */
	type: 'text';

	/**
	 * Component ID from spec.root.nodes
	 * Used to look up configuration and bindings during rendering
	 */
	componentId?: string;

	/**
	 * Processed text properties
	 */
	props: TextProps;
}

/**
 * TextProps contains processed data needed to render a text primitive
 *
 * Passes through the full TextConfig for lossless transformation.
 * The presentation layer handles truncation based on bounding box constraints.
 */
export interface TextProps {
	/**
	 * Full text configuration from the spec
	 */
	config: Omit<TextConfig, 'type'>;

	/**
	 * Formatted value after accessor resolution and format application
	 */
	formattedValue: FormattedValue;
}

/**
 * TableProps contains all processed data needed to render a data table
 *
 * Derives title/description from spec DataTableConfig. This is the contract
 * between the core renderer and the presentation layer. All data transformations
 * (value mappings, type coercion, etc.) are complete.
 */
export interface TableProps extends Pick<DataTableConfig, 'title' | 'description'> {
	/**
	 * Column definitions derived from spec columns and accessor_bindings
	 */
	columns: Column[];

	/**
	 * Processed row data with transformed values
	 */
	data: Row[];
}

/**
 * Column definition derived from DataTableColumn and FieldMetadata
 *
 * Combines spec column config (label, alignment, header, body) with
 * runtime-resolved properties (id from accessor, dataType from FieldMetadata).
 */
export interface Column extends Pick<DataTableColumn, 'label' | 'alignment' | 'header' | 'body'> {
	/**
	 * Field accessor used as column identifier (derived from DataTableColumn.accessor)
	 */
	id: string;

	/**
	 * Primary data type from FieldMetadata.data_types[0]
	 */
	dataType: string;
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
 * - Accessing raw values for operations like sorting and filtering
 * - Debugging value transformations
 */
export interface CellValue {
	/**
	 * Original value from the data source
	 */
	raw: unknown;

	/**
	 * Display value after applying value_mappings and Column.body.format.
	 * Applies value_mappings first, then format for non-mapped values.
	 * Null/undefined pass through from original data values.
	 */
	display: FormattedValue;

	/**
	 * Data type from FieldMetadata for format hint
	 */
	dataType?: string;
}
