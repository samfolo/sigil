# Sigil Specification

This directory contains the formal specification for Sigil's Intermediate Representation (IR).

## Overview

The Sigil specification defines the structure for AI-generated data visualisation components. It serves as:
- **Single source of truth** for component structure and behaviour
- **Contract** between AI generators and renderer implementations
- **Foundation** for validation, documentation, and tooling

## Structure

```
spec/
├── fragments/                        # Modular schema fragments
│   ├── primitives.schema.json        # Base types, enums, shared primitives
│   ├── fields.schema.json            # Field metadata, value mappings
│   ├── filtering.schema.json         # Filter conditions, operators
│   ├── affordances.schema.json       # Data interaction affordances
│   ├── layout.schema.json            # Layout system (stack, grid)
│   ├── components.schema.json        # Component configurations
│   └── core.schema.json              # Root specification schema
├── specification.schema.json         # Bundled schema (GENERATED)
├── config.json                       # Schema metadata & build config
├── examples/                         # Example valid specifications
└── README.md                         # This file
```

## Schema Fragments

The specification is split into logical, maintainable modules:

### 1. **primitives** (`fragments/primitives.schema.json`)
Foundation types used across all fragments.

**Contents:**
- Enums: `DataType`, `DataShape`, `ComponentType`, `FilterType`, etc.
- Operators: `FilterConditionLogicalOperator`, `FilterConditionRelationalOperator`
- Shared types: `Padding`, `SizeConstraint`, `AffordedField`

**Dependencies:** None (leaf module)

### 2. **fields** (`fragments/fields.schema.json`)
Field metadata and display configuration.

**Contents:**
- `FieldMetadata` - Data type info, roles, value mappings
- `ValueMapping` - Display value transformations
- `ValueMappingDisplayConfig` - Visual display configs (chip/label/badge)

**Dependencies:** `primitives`

### 3. **filtering** (`fragments/filtering.schema.json`)
Complete filtering system for data queries.

**Contents:**
- `FilterCondition` - Logical or relational conditions
- `LogicalFilterCondition` - AND/OR/NOT combinations
- `RelationalFilterCondition` - Field comparisons
- `FilterConditionValue` - Value types (literal/field/list/range)

**Dependencies:** `primitives`

### 4. **affordances** (`fragments/affordances.schema.json`)
Data interaction capabilities.

**Contents:**
- `Affordance` - Union of all affordance types
- `VirtualisationAffordance` - Virtual scrolling
- `SortingAffordance` - Column sorting
- `FilteringAffordance` - Data filtering
- `PaginationAffordance` - Pagination controls
- `ExportAffordance` - Data export (CSV/JSON)
- `SelectionAffordance` - Row selection
- `SearchAffordance` - Text search

**Dependencies:** `primitives`, `filtering`

### 5. **layout** (`fragments/layout.schema.json`)
Layout positioning system.

**Contents:**
- `LayoutNode` - Stack or grid layouts
- `LayoutChild` - Layout or component children
- `StackLayoutNode` - Horizontal/vertical stacks
- `GridLayoutNode` - CSS Grid layouts
- Size constraints, spacing, alignment

**Dependencies:** `primitives`

### 6. **components** (`fragments/components.schema.json`)
Component type configurations.

**Contents:**
- `ComponentConfig` - Union of all component configs
- `DataTableConfig` - Tabular data display
- `HierarchyConfig` - Tree/nested data
- `CompositionConfig` - Custom compositions
- `TextInsightConfig` - Text analysis display

**Dependencies:** `affordances`

### 7. **core** (`fragments/core.schema.json`)
Root specification schema.

**Contents:**
- `ComponentSpec` - Top-level spec (entry point)
- `Component` - Component tree, bindings
- `ComponentNode` - Individual component instances

**Dependencies:** `components`, `layout`, `fields`, `primitives`

## Dependency Graph

```
primitives
    ├─→ fields
    ├─→ filtering
    └─→ layout

filtering
    └─→ affordances

affordances
    └─→ components

fields, layout, components, primitives
    └─→ core
```

This structure ensures clean, acyclic dependencies suitable for incremental validation and code generation.

## Building

### Bundle Schema
Combines all fragments into a single `specification.schema.json`:

```bash
npm run spec:bundle
```

### Generate Documentation
Creates markdown documentation from the schema:

```bash
npm run spec:docs
```

### Generate Zod Validation
Generates TypeScript Zod schemas with discriminated union support:

```bash
npm run spec:codegen
```

### Validate Schema
Validates fragment integrity and examples:

```bash
npm run spec:validate
```

### All Tasks
Run all spec-related tasks:

```bash
npm run spec:all
```

## Discriminated Unions

The specification makes extensive use of discriminated unions for type safety and tooling support.

See `config.json` for the complete list of discriminated unions and their variants.

**Examples:**
- `ComponentConfig` discriminated by `type` (data-table | hierarchy | composition | text-insight)
- `Affordance` discriminated by `type` (virtualisation | sorting | filtering | pagination | export | selection | search)
- `LayoutNode` discriminated by `type` (stack | grid)
- `StackLayoutNode` discriminated by `direction` (horizontal | vertical)

## Usage

### For LLM Context

**Full context (when token budget allows):**
```
Provide: spec/specification.schema.json
```

**Constrained context (large schemas):**
```
Provide: Individual fragments from spec/fragments/
```

**Understanding structure:**
```
Provide: spec/config.json
```

### For Validation

Use the generated Zod schemas:

```typescript
import {ComponentSpecSchema} from '@sigil/validation/spec';

const result = ComponentSpecSchema.safeParse(data);
```

### For Documentation

See generated docs in `spec/docs/` or consult the source schema files which include descriptions.

## Design Principles

1. **Generated, not hand-written** - Specs are created by AI for each dataset
2. **Metadata embedded** - Field info, mappings included in spec (not in data)
3. **Data separate** - Actual values provided at render time
4. **Layout agnostic** - Components and layout are orthogonal concerns
5. **Type-safe** - Discriminated unions enable strict validation
6. **JSON-normalised** - All data converted to JSON before spec generation

## Extending the Specification

When adding new types:

1. Add to appropriate fragment (or create new fragment if needed)
2. Update `config.json` dependencies
3. Add discriminated union metadata if applicable
4. Rebuild bundle: `npm run spec:bundle`
5. Update validation: `npm run spec:codegen`
6. Add examples in `examples/`

## Version History

- **v1.0.0** - Initial modular specification structure
