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

export type LayoutNode = StackLayoutNode | GridLayout;

export type LayoutNodeType = "stack" | "grid";

export type LayoutNodeSpacing = "tight" | "normal" | "relaxed";

export interface BaseLayoutNode {
  id: string;
  type: LayoutNodeType;
  width?: SizeConstraint;
  height?: SizeConstraint;
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

export interface GridLayout extends BaseLayoutNode {
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

export interface Affordance {
  kind: AffordanceKind;
  config?: Record<string, any>; // Affordance-specific configuration (TODO: Define exhaustively)
}

export type AffordanceKind =
  | "virtualization"
  | "sorting"
  | "filtering"
  | "pagination"
  | "export"
  | "selection"
  | "search";

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
  affordances?: Affordance[];
  // TODO: Define exhaustive config properties
}

export interface HierarchyConfig {
  type: "hierarchy";
  title?: string;
  description?: string;
  affordances?: Affordance[];
  // TODO: Define exhaustive config properties
}

export interface CompositionConfig {
  type: "composition";
  title?: string;
  description?: string;
  affordances?: Affordance[];
  // TODO: Define exhaustive config properties
}

export interface TextInsightConfig {
  type: "text-insight";
  title?: string;
  description?: string;
  affordances?: Affordance[];
  // TODO: Define exhaustive config properties
}

// ============================================================================
// Runtime Context (separate from spec, data-specific)
// ============================================================================

export interface RenderContext {
  data: any; // Already parsed to JSON
  accessor_bindings: Record<string, Record<string, FieldMetadata>>; // component_id -> (field_path -> metadata)
}

export interface AccessorBinding {
  properties: Record<string, any>
  metadata: FieldMetadata;
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
  details?: ValueMappingDisplayDetails;
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
  accessor: string; // JSONPath
  roles: string[]; // Always array, e.g., ["x", "time"]
  data_types: DataType[]; // First element is primary type, rest are fallbacks
  value_mappings: Record<string, ValueMapping>; // source_value -> display_value and config
  format?: string; // Display format hint (e.g., "DD/MM/YYYY", "£0,0.00")
}

export type DataType = "number" | "string" | "date" | "boolean" | "null" | "array" | "object";
