/**
 * Sigil Component Specification - Intermediate Representation
 *
 * Design principles:
 * - Specs are generated fresh for each dataset, tailored to its semantic meaning
 * - Field metadata, value mappings, and bindings are embedded directly in the spec
 * - Data values are provided separately at render time (not embedded in spec)
 * - Layout and components are separate concerns
 * - Type-specific configs via discriminated unions
 * - Everything normalised to JSON before spec generation
 */

// ============================================================================
// Core Specification
// ============================================================================

/*
 * ComponentSpec is the root container for a complete visualisation specification.
 *
 * Specs are generated fresh for each dataset by LLMs or spec generators, tailored
 * to the specific semantic meaning and structure of that data. Even datasets with
 * identical shapes may require different specs if their semantic meaning differs.
 *
 * The spec contains everything needed to render the visualisation:
 * - Layout structure and component arrangement
 * - Component configurations and affordances
 * - Field metadata, type information, and value mappings
 * - Data shape and structural expectations
 *
 * The spec does NOT contain the actual data values - those are provided separately
 * at render time. This separation allows:
 * - Lightweight serialisation and storage of specs
 * - Rendering different views of the same dataset (filtered, paginated, etc.)
 * - Versioning and evolution of specs independently from data
 *
 * The spec is immutable once created - any modifications create a new version.
 */
export interface ComponentSpec {
  /*
   * Unique identifier for this specification (UUID v4 recommended)
   */
  id: string;

  /*
   * Human-readable title for the visualisation
   */
  title: string;

  /*
   * Optional description explaining the purpose or usage of this spec
   */
  description?: string;

  /*
   * ISO 8601 timestamp of when this spec was created
   * Format: YYYY-MM-DDTHH:mm:ss.sssZ
   */
  created_at: string;

  /*
   * Semantic version for tracking spec evolution and compatibility
   * Increment major for breaking changes, minor for features, patch for fixes
   */
  version: SemVer;

  /*
   * Describes the expected structure of input data this spec is designed for
   * This helps validate data compatibility and guides component selection
   */
  data_shape: DataShape;

  /*
   * Root layout node defining the visual structure and component arrangement
   * Layouts can be nested to create complex hierarchical compositions
   */
  layout: LayoutNode;

  /*
   * Registry of all components used in this spec, keyed by component ID
   * Using a Record ensures O(1) lookup performance and guarantees ID uniqueness
   * Components are referenced from LayoutChild nodes via their IDs
   */
  components: Record<string, ComponentNode>;

  /*
   * Field metadata providing semantic information about data fields for each component
   *
   * Structure: { [component_id]: { [field_accessor]: FieldMetadata } }
   *
   * This maps each component's fields to their metadata (types, roles, display hints, value mappings).
   * The component_id keys correspond to IDs in ComponentSpec.components.
   * The field_accessor keys use dot notation matching AffordedField.accessor syntax.
   *
   * Field metadata includes:
   * - Semantic roles (label, value, category, etc.)
   * - Data types with fallback options for coercion
   * - Value mappings for transforming raw values to display values
   * - Format strings for dates and numbers
   *
   * Example:
   * {
   *   "table-1": {
   *     "user.name": { roles: ["label"], data_types: ["string"], ... },
   *     "user.age": { roles: ["value"], data_types: ["number"], format: "0,0", ... }
   *   }
   * }
   */
  accessor_bindings: Record<string, Record<string, FieldMetadata>>;
}

/*
 * Semantic versioning following the semver.org specification
 * Tracks iterations and evolution of the spec for a given dataset
 */
export interface SemVer {
  /*
   * Major version - increment for breaking changes to the spec structure or rendering requirements
   * E.g., changing component types, restructuring layout, altering field bindings
   */
  major: number;

  /*
   * Minor version - increment for backwards-compatible additions
   * E.g., adding new affordances, additional components, new field metadata
   */
  minor: number;

  /*
   * Patch version - increment for backwards-compatible refinements
   * E.g., fixing field formats, adjusting value mappings, correcting metadata
   */
  patch: number;
}

/*
 * Describes the structural pattern of the source data being visualised
 *
 * This is NOT about how data is displayed, but about the inherent structure
 * of the input data. Helps validate data compatibility with the spec and
 * informs appropriate component selection.
 */
export type DataShape =
  /*
   * Tabular data with rows and columns (e.g., CSV, database tables, spreadsheets)
   */
  | "tabular"

  /*
   * Nested or tree-like structures (e.g., JSON with nested objects, file systems, organisational charts)
   */
  | "hierarchical"

  /*
   * Flat key-value pairs (e.g., configuration files, environment variables, metadata)
   */
  | "key_value"

  /*
   * Network structures with nodes and edges (e.g., social networks, dependency graphs, knowledge graphs)
   */
  | "graph"

  /*
   * Location-based data with coordinates (e.g., GeoJSON, GPS data, spatial datasets)
   */
  | "geospatial";

// ============================================================================
// Layout System
// ============================================================================

/*
 * A layout node defines how child elements are arranged spatially
 *
 * Layouts are composable - a LayoutNode can contain other LayoutNodes,
 * enabling complex hierarchical compositions (e.g., a grid containing stacks,
 * or stacks containing grids).
 */
export type LayoutNode = StackLayoutNode | GridLayoutNode;

/*
 * Discriminator for layout node types used in discriminated unions
 */
export type LayoutNodeType = "stack" | "grid";

/*
 * Predefined spacing scales for consistent visual rhythm
 */
export type LayoutNodeSpacing =
  /*
   * Minimal spacing for dense layouts
   */
  | "tight"

  /*
   * Default spacing for balanced layouts
   */
  | "normal"

  /*
   * Generous spacing for spacious layouts
   */
  | "relaxed";

/*
 * Common properties shared by all layout node types
 *
 * Size constraints work together:
 * - If only `width` is set, it defines the exact or preferred width
 * - If `min_width` and `max_width` are set, they bound the width range
 * - The final size is calculated by the rendering engine based on constraints and content
 */
export interface BaseLayoutNode {
  /*
   * Unique identifier for this layout node
   */
  id: string;

  /*
   * Discriminator identifying which layout type this is
   */
  type: LayoutNodeType;

  /*
   * Preferred or exact width constraint
   */
  width?: SizeConstraint;

  /*
   * Minimum width - layout will not shrink below this
   */
  min_width?: SizeConstraint;

  /*
   * Maximum width - layout will not grow beyond this
   */
  max_width?: SizeConstraint;

  /*
   * Preferred or exact height constraint
   */
  height?: SizeConstraint;

  /*
   * Minimum height - layout will not shrink below this
   */
  min_height?: SizeConstraint;

  /*
   * Maximum height - layout will not grow beyond this
   */
  max_height?: SizeConstraint;

  /*
   * Internal spacing between the layout's edges and its children
   */
  padding?: Padding;
}

/*
 * Direction for linear stack layouts
 */
export type StackLayoutNodeDirection =
  /*
   * Children arranged left-to-right
   */
  | "horizontal"

  /*
   * Children arranged top-to-bottom
   */
  | "vertical";

/*
 * Linear layout that arranges children in a single row or column
 *
 * Stack layouts are simpler than grids and ideal for:
 * - Toolbars and navigation
 * - Form fields in sequence
 * - Card lists
 * - Any linear arrangement of components
 *
 * Alignment works on two axes:
 * - Primary axis (direction of flow): controlled by spacing and flex behaviour
 * - Cross axis: controlled by horizontal_alignment (for vertical stacks) or vertical_alignment (for horizontal stacks)
 */
export interface StackLayoutNode extends BaseLayoutNode {
  /*
   * Discriminator value for stack layouts
   */
  type: "stack";

  /*
   * Flow direction of children
   */
  direction: StackLayoutNodeDirection;

  /*
   * Space between children along the primary axis
   */
  spacing: LayoutNodeSpacing;

  /*
   * How children align horizontally
   * - For vertical stacks: aligns children horizontally (left/center/right/fill)
   * - For horizontal stacks: typically leave undefined and use vertical_alignment instead
   */
  horizontal_alignment?: "start" | "center" | "end" | "stretch";

  /*
   * How children align vertically
   * - For horizontal stacks: aligns children vertically (top/center/bottom/fill)
   * - For vertical stacks: typically leave undefined and use horizontal_alignment instead
   */
  vertical_alignment?: "start" | "center" | "end" | "stretch";

  /*
   * Ordered list of children to render in sequence
   */
  children: LayoutChild[];
}

/*
 * Grid layout that arranges children in rows and columns
 *
 * Grid layouts provide precise two-dimensional control and are ideal for:
 * - Dashboard layouts
 * - Form layouts with labels and inputs
 * - Card grids
 * - Any content requiring alignment on both axes
 *
 * Grid supports both auto-flow (children placed automatically) and
 * explicit positioning (using column_start/row_start on GridChild).
 */
export interface GridLayoutNode extends BaseLayoutNode {
  /*
   * Discriminator value for grid layouts
   */
  type: "grid";

  /*
   * Number of columns in the grid
   */
  columns: number;

  /*
   * Optional number of rows
   * If omitted, rows are created automatically as needed (auto-flow)
   */
  rows?: number;

  /*
   * Space between grid cells (both row and column gaps)
   */
  gap?: LayoutNodeSpacing;

  /*
   * Children with optional positioning and spanning information
   */
  children: GridChild[];
}

/*
 * A child within a grid layout with optional positioning and spanning
 *
 * Positioning modes:
 * - Auto-flow (default): Omit column_start and row_start - child is placed in the next available cell
 * - Explicit: Set column_start and row_start to place child at a specific grid position
 *
 * Grid coordinates are 1-indexed (first column is 1, not 0)
 */
export interface GridChild {
  /*
   * The layout or component to render in this grid cell
   */
  element: LayoutChild;

  /*
   * Number of columns this child spans
   * Default: 1
   */
  column_span?: number;

  /*
   * Number of rows this child spans
   * Default: 1
   */
  row_span?: number;

  /*
   * Explicit column position (1-indexed)
   * Omit to use auto-flow positioning
   */
  column_start?: number;

  /*
   * Explicit row position (1-indexed)
   * Omit to use auto-flow positioning
   */
  row_start?: number;
}

/*
 * A child element within a layout
 *
 * Can be either:
 * - Another layout node (enabling nested/composable layouts)
 * - A component (leaf node referenced by ID from ComponentSpec.components)
 *
 * This discriminated union enables type-safe handling of the two cases.
 */
export type LayoutChild =
  /*
   * Nested layout node for hierarchical composition
   */
  | { type: "layout"; node: LayoutNode }

  /*
   * Reference to a component by its ID
   * The component must exist in ComponentSpec.components
   */
  | { type: "component"; component_id: string };

/*
 * Flexible padding definition supporting shorthand and explicit sides
 *
 * Follows CSS-like conventions for ease of use
 */
export type Padding =
  /*
   * Shorthand: same padding on all four sides (top, right, bottom, left)
   */
  | number

  /*
   * Explicit: specify each side independently
   * Omitted sides default to 0
   */
  | {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };

/*
 * Defines how an element's size is calculated
 *
 * Different constraint types enable different layout behaviours:
 * - Use "fixed" for exact pixel dimensions (e.g., icons, buttons)
 * - Use "flex" for proportional sizing (e.g., sidebar vs main content)
 * - Use "percentage" for responsive layouts (e.g., 50% width)
 * - Use "content" to size based on children (e.g., auto-sizing containers)
 */
export type SizeConstraint =
  /*
   * Fixed size in pixels
   * The element will be exactly this size regardless of content or container
   */
  | { type: "fixed"; value: number }

  /*
   * Flex sizing with a flex factor
   * Element shares available space proportionally with other flex elements
   * E.g., flex: 1 and flex: 2 would give 33% and 67% of space respectively
   */
  | { type: "flex"; value: number }

  /*
   * Percentage of parent container size
   * Value should be between 0 and 100
   */
  | { type: "percentage"; value: number }

  /*
   * Size to fit content
   * Element sizes based on its children's dimensions
   */
  | { type: "content" };

// ============================================================================
// Components
// ============================================================================

/*
 * A component is a leaf node in the layout tree that renders data
 *
 * Components are stored in ComponentSpec.components and referenced from
 * LayoutChild nodes via their IDs. This separation enables:
 * - Component reuse across multiple layout positions
 * - Centralized component configuration
 * - Efficient lookups without tree traversal
 */
export interface ComponentNode {
  /*
   * Unique identifier for this component
   * Referenced by LayoutChild.component_id
   */
  id: string;

  /*
   * The kind of visualisation this component provides
   * Determines which config interface to use
   */
  type: ComponentType;

  /*
   * Type-specific configuration for this component
   * The config type must match the component type (enforced by discriminated union)
   */
  config: ComponentConfig;
}

/*
 * Available component types, each optimised for specific data shapes
 *
 * Components are the "rendering primitives" of the specification system.
 * Each type is designed to handle a particular visualisation pattern.
 */
export type ComponentType =
  /*
   * Tabular display with rows and columns
   * Best for: tabular data shapes, spreadsheet-like views, data grids
   */
  | "data-table"

  /*
   * Tree or nested structure display
   * Best for: hierarchical data shapes, file explorers, org charts, JSON viewers
   */
  | "hierarchy"

  /*
   * Composed/aggregate visualisations combining multiple sub-components
   * Best for: dashboards, multi-faceted views, complex analytical displays
   */
  | "composition"

  /*
   * Text-based insights, summaries, or explanations
   * Best for: key_value data shapes, insights, summaries, explanatory text
   */
  | "text-insight";

/*
 * Reference to a field in the provided data using an accessor path
 *
 * Accessor syntax:
 * - Simple field: "name", "age", "status"
 * - Nested field: "user.profile.email", "metadata.created_at"
 * - Array index: "items[0]", "users[5].name"
 * - Mixed: "data.users[0].contacts[1].email"
 *
 * The accessor is resolved at inference time against the provided data
 */
export interface AffordedField {
  /*
   * Dot-notation path to the field in the data
   * Supports nested objects and array indexing
   */
  accessor: string;
}

/*
 * Affordances are declarative capabilities that enhance component interactivity
 *
 * Design philosophy:
 * - Affordances are opt-in: components work without them, but they enable richer interactions
 * - They are declarative, not imperative: you specify WHAT capabilities exist, not HOW to implement them
 * - Each affordance is independent and composable
 * - The rendering engine implements the actual behaviour based on these declarations
 *
 * Common affordances enable:
 * - Performance optimisations (virtualisation)
 * - Data manipulation (sorting, filtering, search)
 * - User interaction (selection)
 * - Data export (CSV, JSON)
 */
export type Affordance =
  | VirtualisationAffordance
  | SortingAffordance
  | FilteringAffordance
  | PaginationAffordance
  | ExportAffordance
  | SelectionAffordance
  | SearchAffordance;

/*
 * Enables efficient rendering of large datasets by only rendering visible items
 *
 * Virtualisation is critical for performance when displaying thousands of rows.
 * The rendering engine only creates DOM nodes for items in/near the viewport,
 * dramatically reducing memory usage and initial render time.
 *
 * Use this for: large tables, long lists, infinite scrolling
 */
export interface VirtualisationAffordance {
  /*
   * Discriminator for affordance type
   */
  kind: "virtualisation";

  /*
   * Fixed height for each item in pixels
   * Required for optimal performance with fixed-height rows
   * Omit this for dynamic-height items (slower but more flexible)
   */
  item_height?: number;

  /*
   * Number of items to render outside the visible viewport
   * Higher values provide smoother scrolling but use more memory
   * Default: 3
   */
  overscan_count?: number;

  /*
   * Maximum number of items to keep in rendered memory
   * Items beyond this are unmounted to prevent memory leaks
   * Default: 50
   */
  buffer_size?: number;
}

/*
 * Enables sorting data by one or more fields
 *
 * Allows sorting data ascending/descending by field values.
 * Sorting can be restricted to specific fields or allowed on all fields.
 */
export interface SortingAffordance {
  /*
   * Discriminator for affordance type
   */
  kind: "sorting";

  /*
   * Fields that can be sorted
   * Omit to allow sorting on all fields in the component
   */
  allowed_fields?: AffordedField[];

  /*
   * Initial sort field when component first renders
   * Omit to show unsorted data initially
   */
  default_field?: AffordedField;

  /*
   * Initial sort direction
   * Default: "asc"
   */
  default_direction?: "asc" | "desc";
}

/*
 * Enables filtering data based on field values
 *
 * Supports both simple single-field filters and complex multi-condition
 * queries using logical operators.
 *
 * Filter behaviour:
 * - Multiple default_filters are combined with AND logic
 * - User can add/remove filters interactively
 * - Filter types determine appropriate interaction patterns
 */
export interface FilteringAffordance {
  /*
   * Discriminator for affordance type
   */
  kind: "filtering";

  /*
   * Fields that can be filtered
   * Omit to allow filtering on all fields in the component
   */
  allowed_fields?: AffordedField[];

  /*
   * Specifies the filter interaction type for each field
   * Maps field accessor to FilterType (e.g., {"age": "number_range", "name": "text"})
   * Omit to auto-detect based on data types from FieldMetadata
   */
  filter_types?: Record<string, FilterType>;

  /*
   * Filters applied by default when component first renders
   * Useful for pre-filtering data to a relevant subset
   * User can modify/remove these filters interactively
   */
  default_filters?: FilterCondition[];
}

/*
 * Filter interaction types that determine appropriate interaction patterns
 */
export type FilterType =
  /*
   * Text-based filtering with string matching (contains, starts with, equals, etc.)
   */
  | "text"

  /*
   * Numeric range filtering with min/max bounds
   */
  | "number_range"

  /*
   * Date range filtering with start/end dates
   */
  | "date_range"

  /*
   * Selection from predefined options (derived from unique field values)
   */
  | "select"

  /*
   * Boolean filtering
   */
  | "boolean";

/*
 * Logical operators for combining multiple filter conditions
 */
export type FilterConditionLogicalOperator =
  /*
   * All conditions must be true (intersection)
   */
  | "and"

  /*
   * At least one condition must be true (union)
   */
  | "or"

  /*
   * Negates the child condition(s)
   */
  | "not";

/*
 * Combines multiple filter conditions using logical operators
 *
 * Enables complex queries like:
 * - (age > 18 AND country = "UK") OR (status = "verified")
 * - NOT (deleted = true)
 *
 * Conditions can be nested arbitrarily deep for sophisticated filtering.
 */
export interface LogicalFilterCondition {
  /*
   * Discriminator for filter condition type
   */
  type: "logical";

  /*
   * How to combine the child conditions
   */
  operator: FilterConditionLogicalOperator;

  /*
   * Child conditions to combine
   * Can include both relational and other logical conditions (recursive)
   */
  conditions: FilterCondition[];
}

/*
 * Comparison operators for relational filter conditions
 */
export type FilterConditionRelationalOperator =
  /*
   * Exact equality (field === value)
   */
  | "equals"

  /*
   * Inequality (field !== value)
   */
  | "not_equals"

  /*
   * String contains substring (case-insensitive recommended)
   */
  | "contains"

  /*
   * String does not contain substring
   */
  | "not_contains"

  /*
   * String starts with prefix
   */
  | "starts_with"

  /*
   * String ends with suffix
   */
  | "ends_with"

  /*
   * Numeric/date comparison (field > value)
   */
  | "greater_than"

  /*
   * Numeric/date comparison (field < value)
   */
  | "less_than"

  /*
   * Numeric/date comparison (field >= value)
   */
  | "greater_than_or_equal"

  /*
   * Numeric/date comparison (field <= value)
   */
  | "less_than_or_equal"

  /*
   * Value is within a range (inclusive)
   * Use with RangeRelationalFilterConditionValue
   */
  | "between"

  /*
   * Value is in a list of options
   * Use with ListRelationalFilterConditionValue
   */
  | "in"

  /*
   * Value is not in a list of options
   * Use with ListRelationalFilterConditionValue
   */
  | "not_in";

/*
 * A literal value to compare against
 */
interface ValueRelationalFilterConditionValue {
  /*
   * Discriminator for value type
   */
  kind: "value";

  /*
   * The literal value to compare
   */
  value: string | number | boolean | null;
}

/*
 * Reference to another field's value for field-to-field comparison
 *
 * Example: Filter rows where "end_date" > "start_date"
 */
interface FieldRelationalFilterConditionValue {
  /*
   * Discriminator for value type
   */
  kind: "field";

  /*
   * The field to compare against
   */
  field: AffordedField;
}

/*
 * A list of values for "in" or "not_in" operators
 */
interface ListRelationalFilterConditionValue {
  /*
   * Discriminator for value type
   */
  kind: "list";

  /*
   * The list of acceptable values
   */
  values: Array<string | number | boolean | null>;
}

/*
 * A numeric or date range for "between" operator
 *
 * Both start and end are inclusive
 */
interface RangeRelationalFilterConditionValue {
  /*
   * Discriminator for value type
   */
  kind: "range";

  /*
   * Range start (inclusive)
   */
  start: string | number;

  /*
   * Range end (inclusive)
   */
  end: string | number;
}

/*
 * The value side of a filter comparison
 *
 * Can be a literal value, reference to another field, list, or range
 */
export type FilterConditionValue =
  | ValueRelationalFilterConditionValue
  | FieldRelationalFilterConditionValue
  | ListRelationalFilterConditionValue
  | RangeRelationalFilterConditionValue;

/*
 * A single field-value comparison
 *
 * Example: {type: "relational", field: {accessor: "age"}, operator: "greater_than", value: {kind: "value", value: 18}}
 */
export interface RelationalFilterCondition {
  /*
   * Discriminator for filter condition type
   */
  type: "relational";

  /*
   * The field to filter on
   */
  field: AffordedField;

  /*
   * How to compare the field to the value
   */
  operator: FilterConditionRelationalOperator;

  /*
   * What to compare the field against
   */
  value: FilterConditionValue;
}

/*
 * A filter condition can be either a relational comparison or a logical combination
 *
 * This recursive structure enables arbitrarily complex filter expressions.
 */
export type FilterCondition = LogicalFilterCondition | RelationalFilterCondition;

/*
 * Enables paginated display of data with configurable page sizes
 *
 * Pagination improves performance and usability for large datasets by
 * displaying data in manageable chunks. Users can navigate between pages
 * and optionally adjust the page size.
 *
 * Note: Pagination and virtualisation serve different purposes:
 * - Use pagination for traditional page-based navigation
 * - Use virtualisation for continuous scrolling or very large datasets
 * - They can be combined (paginated + virtualised pages)
 */
export interface PaginationAffordance {
  /*
   * Discriminator for affordance type
   */
  kind: "pagination";

  /*
   * Default number of items displayed per page
   */
  page_size: number;

  /*
   * Whether to allow users to change page size
   * Default: true
   */
  show_size_options?: boolean;

  /*
   * Available page size options
   * Default: [10, 25, 50, 100]
   */
  size_options?: number[];
}

/*
 * Enables exporting data to various file formats
 *
 * Provides ability to export visible or filtered data.
 * Export respects current filters and sorting but typically exports ALL
 * matching data (not just the current page).
 */
export interface ExportAffordance {
  /*
   * Discriminator for affordance type
   */
  kind: "export";

  /*
   * Available export formats (e.g., ["csv", "json"])
   */
  formats: ExportAffordanceFormat[];

  /*
   * Whether to include column headers in exported files
   * Default: true
   */
  include_headers?: boolean;

  /*
   * Template for generated filename
   * Supports placeholders: {title}, {timestamp}, {date}
   * Default: "{title}_{timestamp}"
   */
  filename_template?: string;
}

/*
 * Supported export file formats
 */
export type ExportAffordanceFormat =
  /*
   * Comma-separated values (tabular data)
   */
  | "csv"

  /*
   * JSON array of objects
   */
  | "json";

/*
 * Selection mode for interactive row selection
 */
type SelectionAffordanceMode =
  /*
   * Only one item can be selected at a time
   */
  | "single"

  /*
   * Multiple items can be selected simultaneously
   */
  | "multiple";

/*
 * Enables interactive selection of rows/items
 *
 * Allows selecting data rows, useful for bulk actions,
 * detail views, or highlighting items of interest.
 */
export interface SelectionAffordance {
  /*
   * Discriminator for affordance type
   */
  kind: "selection";

  /*
   * Single or multiple selection mode
   */
  mode: SelectionAffordanceMode;

  /*
   * Whether to provide explicit selection indicators
   * Default: true for multiple mode, false for single mode
   */
  show_selection_indicators?: boolean;

  /*
   * Whether selections persist when navigating between pages
   * Default: false (selections reset on page change)
   */
  preserve_across_pages?: boolean;
}

/*
 * Enables full-text search across data fields
 *
 * Filters data to matching rows based on text queries.
 * Search is typically less structured than filtering but more
 * convenient for quick queries.
 *
 * Search vs Filter:
 * - Search: Quick, text-based, searches across multiple fields
 * - Filter: Structured, field-specific, supports complex conditions
 */
export interface SearchAffordance {
  /*
   * Discriminator for affordance type
   */
  kind: "search";

  /*
   * Fields to search within
   * Omit to search all text fields in the component
   */
  searchable_fields?: AffordedField[];

  /*
   * Whether search is case-sensitive
   * Default: false (case-insensitive)
   */
  case_sensitive?: boolean;

  /*
   * Minimum number of characters before search activates
   * Prevents expensive searches on very short inputs
   * Default: 1
   */
  min_characters?: number;
}

/*
 * Component-specific configuration using discriminated unions
 *
 * Each component type has its own config interface with a discriminator
 * field that matches the ComponentType. This provides type safety - when
 * you know the component type, TypeScript narrows to the correct config.
 *
 * All configs share common properties (title, description, affordances)
 * plus type-specific properties defined in each interface.
 */
export type ComponentConfig =
  | DataTableConfig
  | HierarchyConfig
  | CompositionConfig
  | TextInsightConfig;

/*
 * Configuration for data table components
 *
 * Data tables display tabular data with rows and columns, supporting
 * common tabular operations like sorting, filtering, and pagination.
 *
 * Best used with: data_shape = "tabular"
 */
export interface DataTableConfig {
  /*
   * Discriminator matching ComponentType
   */
  type: "data-table";

  /*
   * Optional title displayed above the table
   */
  title?: string;

  /*
   * Optional description explaining the data
   */
  description?: string;

  /*
   * Interactive capabilities enabled for this table
   * Common affordances: sorting, filtering, pagination, virtualisation, search, export
   */
  affordances: Affordance[];
  // TODO: Define exhaustive config properties (column definitions, styling, etc.)
}

/*
 * Configuration for hierarchy/tree components
 *
 * Hierarchy components display nested or tree-structured data with
 * expand/collapse functionality and hierarchical navigation.
 *
 * Best used with: data_shape = "hierarchical"
 */
export interface HierarchyConfig {
  /*
   * Discriminator matching ComponentType
   */
  type: "hierarchy";

  /*
   * Optional title displayed above the hierarchy
   */
  title?: string;

  /*
   * Optional description explaining the structure
   */
  description?: string;

  /*
   * Interactive capabilities enabled for this hierarchy
   * Common affordances: search, selection, export
   */
  affordances: Affordance[];
  // TODO: Define exhaustive config properties (expand/collapse behaviour, indentation, etc.)
}

/*
 * Configuration for composition components
 *
 * Compositions are meta-components that combine multiple sub-components
 * into a unified visualisation (e.g., a dashboard with multiple charts).
 *
 * Best used with: any data_shape, depending on sub-components
 */
export interface CompositionConfig {
  /*
   * Discriminator matching ComponentType
   */
  type: "composition";

  /*
   * Optional title for the entire composition
   */
  title?: string;

  /*
   * Optional description of what this composition shows
   */
  description?: string;

  /*
   * Interactive capabilities for the composition as a whole
   * Note: sub-components have their own affordances
   */
  affordances: Affordance[];
  // TODO: Define exhaustive config properties (sub-component references, coordination, etc.)
}

/*
 * Configuration for text insight components
 *
 * Text insights display textual information, summaries, or key-value
 * metadata in a readable format.
 *
 * Best used with: data_shape = "key_value"
 */
export interface TextInsightConfig {
  /*
   * Discriminator matching ComponentType
   */
  type: "text-insight";

  /*
   * Optional title for the insight
   */
  title?: string;

  /*
   * Optional description of the insight's purpose
   */
  description?: string;

  /*
   * Interactive capabilities for text insights
   * Common affordances: search, export
   */
  affordances: Affordance[];
  // TODO: Define exhaustive config properties (formatting, highlighting, etc.)
}

// ============================================================================
// Field Metadata and Value Mappings
// ============================================================================

/*
 * Display configuration details for chip-style value mappings
 *
 * Chips are compact UI elements with optional icons, typically used for
 * tags, statuses, or categories.
 */
interface ValueMappingChipDisplayConfigDetails {
  /*
   * Chip colour (CSS colour string)
   * Examples: "red", "#ff0000", "rgb(255, 0, 0)"
   */
  color?: string;

  /*
   * Icon identifier to display in the chip
   * Examples: "check", "alert", "info"
   * The specific icon set is determined by the rendering engine
   */
  icon?: string;
}

/*
 * Display configuration details for label-style value mappings
 *
 * Labels are simple text with optional colouring, used for inline annotations.
 */
interface ValueMappingLabelDisplayConfigDetails {
  /*
   * Label text colour (CSS colour string)
   * Examples: "blue", "#0000ff"
   */
  color?: string;
}

/*
 * Display configuration details for badge-style value mappings
 *
 * Badges are prominent indicators, typically used for counts or status indicators.
 */
interface ValueMappingBadgeDisplayConfigDetails {
  /*
   * Badge colour (CSS colour string)
   * Examples: "green", "#00ff00"
   */
  color?: string;
}

/*
 * Available display styles for value mappings
 */
export type ValueMappingDisplayType =
  /*
   * Compact pill-shaped element with optional icon
   */
  | "chip"

  /*
   * Simple coloured text
   */
  | "label"

  /*
   * Prominent indicator, often circular or rectangular
   */
  | "badge";

/*
 * Union of all display configuration detail types
 */
export type ValueMappingDisplayDetails =
  | ValueMappingChipDisplayConfigDetails
  | ValueMappingLabelDisplayConfigDetails
  | ValueMappingBadgeDisplayConfigDetails;

/*
 * Base interface for value mapping display configurations
 */
export interface ValueMappingDisplayConfigBase {
  /*
   * The display style to use
   */
  type: ValueMappingDisplayType;
}

/*
 * Display configuration for chip-style rendering
 */
interface ValueMappingChipDisplayConfig extends ValueMappingDisplayConfigBase {
  /*
   * Discriminator for chip display
   */
  type: "chip";

  /*
   * Optional chip-specific styling
   */
  details?: ValueMappingChipDisplayConfigDetails;
}

/*
 * Display configuration for label-style rendering
 */
interface ValueMappingLabelDisplayConfig extends ValueMappingDisplayConfigBase {
  /*
   * Discriminator for label display
   */
  type: "label";

  /*
   * Optional label-specific styling
   */
  details?: ValueMappingLabelDisplayConfigDetails;
}

/*
 * Display configuration for badge-style rendering
 */
interface ValueMappingBadgeDisplayConfig extends ValueMappingDisplayConfigBase {
  /*
   * Discriminator for badge display
   */
  type: "badge";

  /*
   * Optional badge-specific styling
   */
  details?: ValueMappingBadgeDisplayConfigDetails;
}

/*
 * Discriminated union of all display configuration types
 */
export type ValueMappingDisplayConfig =
  | ValueMappingChipDisplayConfig
  | ValueMappingLabelDisplayConfig
  | ValueMappingBadgeDisplayConfig;

/*
 * Defines how a raw data value should be displayed
 *
 * Value mappings transform source values into human-readable display values
 * with optional visual styling. Common use cases:
 * - Status codes: 0 → "Pending" (yellow chip), 1 → "Complete" (green chip)
 * - Boolean flags: true → "Yes" (green label), false → "No" (red label)
 * - Categories: "cat_a" → "Category A" (blue badge)
 *
 * The source value is the key in FieldMetadata.value_mappings,
 * and this ValueMapping is the corresponding value.
 */
export interface ValueMapping {
  /*
   * The human-readable text to display instead of the raw value
   */
  display_value: string;

  /*
   * Optional visual styling for the display value
   * If omitted, the value is displayed as plain text
   */
  display_config?: ValueMappingDisplayConfig;
}

/*
 * Metadata describing how a data field should be interpreted and displayed
 *
 * FieldMetadata provides the semantic layer between raw data and visualisation.
 * It tells the rendering engine:
 * - What role(s) the field plays (e.g., label, value, time axis)
 * - What data type(s) it contains (with fallbacks for type coercion)
 * - How to transform values for display (mappings)
 * - How to format values (date/number formatting)
 */
export interface FieldMetadata {
  /*
   * Semantic roles this field plays in the visualisation
   *
   * Always an array to support fields with multiple roles.
   * Common roles:
   * - "label": Human-readable identifier (e.g., name, title)
   * - "value": Numeric or quantitative data
   * - "time": Temporal data for time-series
   * - "x", "y": Positional data for charts
   * - "category": Categorical grouping
   * - "id": Unique identifier
   *
   * Example: ["x", "time"] for a time-series x-axis
   */
  roles: string[];

  /*
   * Data types for this field, in order of preference
   *
   * First element is the primary type, subsequent elements are fallbacks
   * for type coercion if the primary type fails.
   *
   * Example: ["number", "string"] means "try to parse as number, fall back to string"
   */
  data_types: DataType[];

  /*
   * Mappings from source values to display values
   *
   * Maps raw data values to ValueMapping objects that define how to display them.
   * Keys are the source values (as strings), values are the display transformations.
   *
   * Example:
   * {
   *   "0": { display_value: "Inactive", display_config: { type: "chip", details: { color: "grey" } } },
   *   "1": { display_value: "Active", display_config: { type: "chip", details: { color: "green" } } }
   * }
   */
  value_mappings?: Record<string, ValueMapping>;

  /*
   * Format string for displaying values
   *
   * Uses format strings appropriate to the data type:
   * - Dates: "DD/MM/YYYY", "YYYY-MM-DD HH:mm:ss", "MMM D, YYYY"
   * - Numbers: "0,0.00", "£0,0", "$0.00a", "0%"
   * - Strings: typically omitted (displayed as-is)
   *
   * The rendering engine determines how to interpret format strings.
   */
  format?: string;
}

/*
 * Supported data types for field values
 *
 * These types are used for type validation, coercion, and determining
 * appropriate display components (e.g., date pickers for dates).
 */
export type DataType =
  /*
   * Numeric values (integers and floats)
   */
  | "number"

  /*
   * Text values
   */
  | "string"

  /*
   * Temporal values (dates, timestamps)
   */
  | "date"

  /*
   * Boolean true/false
   */
  | "boolean"

  /*
   * Explicit null values
   */
  | "null"

  /*
   * Array/list structures
   */
  | "array"

  /*
   * Nested object structures
   */
  | "object"

  /*
   * Undefined/missing values
   */
  | "undefined"

  /*
   * Unknown or mixed types
   */
  | "unknown";
