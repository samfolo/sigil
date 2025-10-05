/**
 * Sigil Component Specification - Intermediate Representation
 * 
 * Design principles:
 * - Specs are reusable templates, decoupled from specific data sources
 * - Data bindings, value mappings, and field metadata provided at runtime via RenderContext
 * - Layout and components are separate concerns
 * - Type-specific configs via discriminated unions
 * - Everything normalised to JSON before spec generation
 */

// ============================================================================
// Core Specification
// ============================================================================

export interface ComponentSpec {
  id: string; // UUID
  title: string;
  description?: string;
  created_at: string; // ISO 8601
  version: SemVer;
  data_shape: DataShape;
  layout: LayoutNode;
  components: Record<string, ComponentNode>; // Map for O(1) lookup and ID uniqueness
}

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

export type DataShape =
  | "tabular"           // Rows and columns
  | "hierarchical"      // Nested/tree structure
  | "key_value"         // Config-like
  | "graph"             // Nodes and edges
  | "geospatial";       // Location data

// ============================================================================
// Layout System
// ============================================================================

export type LayoutNode = StackLayoutNode | GridLayoutNode;

export type LayoutNodeType = "stack" | "grid";

export type LayoutNodeSpacing = "tight" | "normal" | "relaxed";

export interface BaseLayoutNode {
  id: string;
  type: LayoutNodeType;
  width?: SizeConstraint;
  min_width?: SizeConstraint;
  max_width?: SizeConstraint;
  height?: SizeConstraint;
  min_height?: SizeConstraint;
  max_height?: SizeConstraint;
  padding?: Padding;
}

export type StackLayoutNodeDirection = "horizontal" | "vertical";

export interface StackLayoutNode extends BaseLayoutNode {
  type: "stack";
  direction: StackLayoutNodeDirection;
  spacing: LayoutNodeSpacing;
  horizontal_alignment?: "start" | "center" | "end" | "stretch";
  vertical_alignment?: "start" | "center" | "end" | "stretch";
  children: LayoutChild[];
}

export interface GridLayoutNode extends BaseLayoutNode {
  type: "grid";
  columns: number;
  rows?: number;
  gap?: LayoutNodeSpacing;
  children: GridChild[];
}

export interface GridChild {
  element: LayoutChild;
  column_span?: number;  // Default 1
  row_span?: number;     // Default 1
  column_start?: number; // Optional explicit positioning
  row_start?: number;
}

export type LayoutChild =
  | { type: "layout"; node: LayoutNode }
  | { type: "component"; component_id: string };

export type Padding =
  | number  // Shorthand for all sides
  | {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };

export type SizeConstraint =
  | { type: "fixed"; value: number }
  | { type: "flex"; value: number }
  | { type: "percentage"; value: number }
  | { type: "content" }; // Size to content

// ============================================================================
// Components
// ============================================================================

export interface ComponentNode {
  id: string;
  type: ComponentType;
  config: ComponentConfig;
}

export type ComponentType =
  | "data-table"
  | "hierarchy"
  | "composition"
  | "text-insight";

export interface AffordedField {
  accessor: string; // Field accessor
}

export type Affordance =
  | VirtualisationAffordance
  | SortingAffordance
  | FilteringAffordance
  | PaginationAffordance
  | ExportAffordance
  | SelectionAffordance
  | SearchAffordance;

export interface VirtualisationAffordance {
  kind: "virtualisation";
  item_height?: number; // Fixed height in pixels, omit for dynamic
  overscan_count?: number; // Number of items to render outside viewport (default: 3)
  buffer_size?: number; // Number of items to keep in memory (default: 50)
}

export interface SortingAffordance {
  kind: "sorting";
  allowed_fields?: AffordedField[]; // Field accessors that can be sorted, omit for all fields
  default_field?: AffordedField; // Default sort field
  default_direction?: "asc" | "desc"; // Default sort direction (default: "asc")
}

export interface FilteringAffordance {
  kind: "filtering";
  allowed_fields?: AffordedField[]; // Field accessors that can be filtered, omit for all fields
  filter_types?: Record<string, FilterType>; // field_accessor -> filter type
  default_filters?: FilterCondition[]; // Filters applied by default
}

export type FilterType = "text" | "number_range" | "date_range" | "select" | "boolean";

export type FilterConditionLogicalOperator = "and" | "or" | "not";

export interface LogicalFilterCondition {
  type: "logical";
  operator: FilterConditionLogicalOperator;
  conditions: FilterCondition[];
}

export type FilterConditionRelationalOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "between"
  | "in"
  | "not_in";

interface ValueRelationalFilterConditionValue {
  kind: "value";
  value: string | number | boolean | null;
}

interface FieldRelationalFilterConditionValue {
  kind: "field";
  field: AffordedField;
}

interface ListRelationalFilterConditionValue {
  kind: "list";
  values: Array<string | number | boolean | null>;
}

interface RangeRelationalFilterConditionValue {
  kind: "range";
  start: string | number; // Inclusive
  end: string | number;   // Inclusive
}

export type FilterConditionValue =
  | ValueRelationalFilterConditionValue
  | FieldRelationalFilterConditionValue
  | ListRelationalFilterConditionValue
  | RangeRelationalFilterConditionValue;

export interface RelationalFilterCondition {
  type: "relational";
  field: AffordedField;
  operator: FilterConditionRelationalOperator;
  value: FilterConditionValue;
}

export type FilterCondition = LogicalFilterCondition | RelationalFilterCondition;

export interface PaginationAffordance {
  kind: "pagination";
  page_size: number; // Default number of items per page
  show_size_options?: boolean; // Show page size selector (default: true)
  size_options?: number[]; // Available page sizes (default: [10, 25, 50, 100])
}

export interface ExportAffordance {
  kind: "export";
  formats: ExportAffordanceFormat[]; // Available export formats
  include_headers?: boolean; // Include column headers (default: true)
  filename_template?: string; // Template for filename (default: "{title}_{timestamp}")
}

export type ExportAffordanceFormat = "csv" | "json";

type SelectionAffordanceMode = "single" | "multiple";

export interface SelectionAffordance {
  kind: "selection";
  mode: SelectionAffordanceMode; // Single or multiple selection
  show_checkboxes?: boolean; // Show selection checkboxes (default: true for multiple)
  preserve_across_pages?: boolean; // Keep selections when paginating (default: false)
}


export interface SearchAffordance {
  kind: "search";
  searchable_fields?: AffordedField[]; // Field accessors to search, omit for all text fields
  case_sensitive?: boolean; // Case-sensitive search (default: false)
  min_characters?: number; // Minimum characters before search triggers (default: 1)
}

// Component-specific configs (discriminated union)
export type ComponentConfig =
  | DataTableConfig
  | HierarchyConfig
  | CompositionConfig
  | TextInsightConfig;

// Placeholder configs - to be defined exhaustively per component type
export interface DataTableConfig {
  type: "data-table";
  title?: string;
  description?: string;
  affordances: Affordance[];
  // TODO: Define exhaustive config properties
}

export interface HierarchyConfig {
  type: "hierarchy";
  title?: string;
  description?: string;
  affordances: Affordance[];
  // TODO: Define exhaustive config properties
}

export interface CompositionConfig {
  type: "composition";
  title?: string;
  description?: string;
  affordances: Affordance[];
  // TODO: Define exhaustive config properties
}

export interface TextInsightConfig {
  type: "text-insight";
  title?: string;
  description?: string;
  affordances: Affordance[];
  // TODO: Define exhaustive config properties
}

// ============================================================================
// Runtime Context (separate from spec, data-specific)
// ============================================================================

export interface RenderContext {
  data: any; // Already parsed to JSON
  accessor_bindings: Record<string, Record<string, FieldMetadata>>; // component_id -> (field_path -> metadata)
}

// ============================================================================
// Field Metadata and Value Mappings
// ============================================================================

interface ValueMappingChipDisplayConfigDetails {
  color?: string; // e.g., "red", "#ff0000"
  icon?: string;  // e.g., "check", "alert"
}

interface ValueMappingLabelDisplayConfigDetails {
  color?: string; // e.g., "blue", "#0000ff"
}

interface ValueMappingBadgeDisplayConfigDetails {
  color?: string; // e.g., "green", "#00ff00"
}

export type ValueMappingDisplayType = "chip" | "label" | "badge";

export type ValueMappingDisplayDetails = 
  | ValueMappingChipDisplayConfigDetails
  | ValueMappingLabelDisplayConfigDetails
  | ValueMappingBadgeDisplayConfigDetails;

export interface ValueMappingDisplayConfigBase {
  type: ValueMappingDisplayType;
}

interface ValueMappingChipDisplayConfig extends ValueMappingDisplayConfigBase {
  type: "chip";
  details?: ValueMappingChipDisplayConfigDetails;
}

interface ValueMappingLabelDisplayConfig extends ValueMappingDisplayConfigBase {
  type: "label";
  details?: ValueMappingLabelDisplayConfigDetails;
}

interface ValueMappingBadgeDisplayConfig extends ValueMappingDisplayConfigBase {
  type: "badge";
  details?: ValueMappingBadgeDisplayConfigDetails;
}

export type ValueMappingDisplayConfig = 
  | ValueMappingChipDisplayConfig
  | ValueMappingLabelDisplayConfig
  | ValueMappingBadgeDisplayConfig;

export interface ValueMapping {
  display_value: string;
  display_config?: ValueMappingDisplayConfig;
}

export interface FieldMetadata {
  roles: string[]; // Always array, e.g., ["x", "time"]
  data_types: DataType[]; // First element is primary type, rest are fallbacks
  value_mappings?: Record<string, ValueMapping>; // source_value -> display_value and config
  format?: string; // Display format hint (e.g., "DD/MM/YYYY", "£0,0.00")
}

export type DataType = "number" | "string" | "date" | "boolean" | "null" | "array" | "object" | "undefined" | "unknown";
