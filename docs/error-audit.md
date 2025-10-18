# Error Audit - Rendering Pipeline

Comprehensive audit of all `err()` calls in the rendering pipeline to inform rich error helper design.

## Overview

- **Total implementation files analysed**: 10
- **Total error call sites**: 23 (excluding propagated errors)
- **Unique error messages**: 19

## Analysis by File

### 1. helpers.ts (src/agent/tools/helpers.ts)

Function: `extractArray`

#### Error 1.1: no_array_property

**Location**: helpers.ts:39

**Error Message**: `'no_array_property'`

**Context Available**:
- `data`: `Record<string, unknown>` - The object being examined
- `dataRecord`: Same as `data`, cast to Record
- `commonArrayProps`: `['features', 'items', 'data', 'results', 'records', 'rows']` - List of checked properties

**Path Construction**:
- Could show: `"Given object with keys: ${Object.keys(dataRecord).join(', ')}"`
- Could show: `"Checked properties: ${commonArrayProps.join(', ')}"`

**Candidate Lists**:
- ✓ **Available**: `Object.keys(dataRecord)` - All actual keys in the object
- ✓ **Expected**: `commonArrayProps` - Properties that were checked
- Suggestions could be: "Did you mean `${closestMatch}`?" (using string similarity)

**Rich Error Potential**: HIGH
- Clear context of what was expected vs what was found
- Can provide specific suggestions based on actual object keys

---

#### Error 1.2: not_array

**Location**: helpers.ts:43

**Error Message**: `'not_array'`

**Context Available**:
- `data`: `unknown` - The data that failed array checks
- `typeof data`: The actual type

**Path Construction**:
- Could show: `"Received type: ${typeof data}"`
- Could show: `"Received value: ${JSON.stringify(data).substring(0, 100)}"`

**Candidate Lists**:
- ✗ **None available** - This is a type error with no clear suggestions

**Rich Error Potential**: MEDIUM
- Can show what was received
- Limited actionable suggestions

---

### 2. queryJSONPath.ts (renderer/core/utils/queryJSONPath.ts)

Function: `queryJSONPath`

#### Error 2.1: invalid_accessor

**Location**: queryJSONPath.ts:64

**Error Message**: `'invalid_accessor'`

**Context Available**:
- `accessor`: `string` - The invalid accessor that was provided
- `data`: `unknown` - The data being queried

**Path Construction**:
- Could show: `"Accessor '${accessor}' must start with '$'"`
- Could show: `"Received: '${accessor}'"`

**Candidate Lists**:
- ✓ **Suggestion**: If accessor doesn't start with `$`, suggest: `"Did you mean '$.${accessor}'?"`

**Rich Error Potential**: HIGH
- Clear fix available (prepend `$`)
- Simple validation error

---

#### Error 2.2: query_error (validation)

**Location**: queryJSONPath.ts:69

**Error Message**: `'query_error'`

**Context Available**:
- `data`: `unknown` - The data that failed validation
- `typeof data`: The actual type
- `accessor`: `string` - The JSONPath being attempted

**Path Construction**:
- Could show: `"Cannot query ${typeof data} with accessor '${accessor}'"`
- Could show: `"Data must be a non-null object"`

**Candidate Lists**:
- ✗ **None available** - Type validation error

**Rich Error Potential**: MEDIUM
- Can explain what went wrong
- No clear suggestions for fix

---

#### Error 2.3: query_error (catch)

**Location**: queryJSONPath.ts:83

**Error Message**: `'query_error'`

**Context Available**:
- `accessor`: `string` - The JSONPath that caused the error
- `data`: `unknown` - The data being queried
- (Caught exception available but not captured)

**Path Construction**:
- Could show: `"Failed to query accessor '${accessor}'"`
- Could capture and show: The actual JSONPath library error message

**Candidate Lists**:
- ✗ **None available** - Would need to inspect the actual data structure to suggest alternatives

**Rich Error Potential**: MEDIUM
- Could capture and include the underlying error
- Difficult to provide suggestions without data introspection

---

#### Error 2.4: expected_single_value

**Location**: queryJSONPath.ts:117

**Error Message**: `'expected_single_value'`

**Context Available**:
- `accessor`: `string` - The accessor that returned an array
- `result.data`: `unknown[]` - The array that was returned
- `data`: `unknown` - The original data

**Path Construction**:
- Could show: `"Accessor '${accessor}' returned an array of ${result.data.length} items"`
- Could show: `"Expected single value but got [${result.data.length} items]"`

**Candidate Lists**:
- ✓ **Suggestion**: If accessor contains `[*]`, suggest removing it
- ✓ **Suggestion**: If accessor contains `..`, suggest making it more specific
- ✓ **Suggestion**: `"Try accessing a specific index: '${accessor}[0]'"`

**Rich Error Potential**: HIGH
- Can show what was returned
- Can suggest specific fixes (add array index, remove wildcard)

---

### 3. aggregateData.ts (src/agent/tools/aggregateData/aggregateData.ts)

Function: `countItems`

#### Error 3.1: not_an_array

**Location**: aggregateData.ts:32

**Error Message**: `'not_an_array'`

**Context Available**:
- `field`: `string` - The JSONPath accessor
- `nestedData`: `unknown` - The value at that path
- `data`: `unknown` - The original data
- `typeof nestedData`: The actual type

**Path Construction**:
- Could show: `"Value at '${field}' is ${typeof nestedData}, expected array"`
- Could show: `"Received: ${JSON.stringify(nestedData).substring(0, 100)}"`

**Candidate Lists**:
- ✗ **None available** - Type error, no alternatives

**Rich Error Potential**: MEDIUM
- Can show what was found
- Limited suggestions

---

Function: `aggregateData`

#### Error 3.2: field_required

**Location**: aggregateData.ts:74

**Error Message**: `'field_required'`

**Context Available**:
- `operation`: `AggregateOperation` - The operation being attempted ('sum' | 'average' | 'min' | 'max')
- `arrayData`: `unknown[]` - The array being aggregated
- `data`: `unknown` - The original data

**Path Construction**:
- Could show: `"Operation '${operation}' requires a field parameter"`
- Could show: `"Aggregating ${arrayData.length} items"`

**Candidate Lists**:
- ✓ **Potential**: Could inspect first item and suggest fields
- ✓ **Suggestion**: If `arrayData.length > 0`, show available keys from first item

**Rich Error Potential**: HIGH
- Can inspect data structure
- Can suggest available numeric fields from sample data

---

### 4. layout.ts (renderer/core/utils/layout.ts)

Function: `extractFirstLayoutChild`

#### Error 4.1: Stack layout has no children

**Location**: layout.ts:22

**Error Message**: `'Stack layout has no children'`

**Context Available**:
- `layout`: `LayoutNode` - The stack layout
- `layout.type`: `'stack'`
- `layout.children`: Empty array

**Path Construction**:
- Could show: `"Stack layout has 0 children"`
- Path: `"root.layout (type: stack)"`

**Candidate Lists**:
- ✗ **None available** - Structural error in spec

**Rich Error Potential**: MEDIUM
- Can show the path to the problematic layout
- No suggestions (this is a spec authoring error)

---

#### Error 4.2: Grid layout has no children

**Location**: layout.ts:30

**Error Message**: `'Grid layout has no children'`

**Context Available**:
- `layout`: `LayoutNode` - The grid layout
- `layout.type`: `'grid'`
- `layout.children`: Empty array

**Path Construction**:
- Could show: `"Grid layout has 0 children"`
- Path: `"root.layout (type: grid)"`

**Candidate Lists**:
- ✗ **None available** - Structural error in spec

**Rich Error Potential**: MEDIUM
- Can show the path to the problematic layout
- No suggestions (this is a spec authoring error)

---

#### Error 4.3: Unknown layout type

**Location**: layout.ts:37

**Error Message**: `` `Unknown layout type: ${(_exhaustive as {type: string}).type}` ``

**Context Available**:
- `layout`: The unknown layout
- `layout.type`: The unexpected type value

**Path Construction**:
- Already includes the type in message
- Path: `"root.layout"`

**Candidate Lists**:
- ✓ **Valid types**: `['stack', 'grid']`
- ✓ **Suggestion**: Could suggest closest match from valid types

**Rich Error Potential**: HIGH
- Can show expected vs received
- Can suggest valid alternatives

---

### 5. buildRenderTree.ts (renderer/core/buildRenderTree/buildRenderTree.ts)

Function: `buildRenderTree`

#### Error 5.1: Component not found in nodes registry

**Location**: buildRenderTree.ts:48

**Error Message**: `` `Component "${componentId}" not found in nodes registry` ``

**Context Available**:
- `componentId`: `string` - The ID being looked up
- `spec.root.nodes`: `Record<string, ComponentNode>` - The registry
- `Object.keys(spec.root.nodes)`: All valid component IDs

**Path Construction**:
- Already includes component ID in message
- Path: `"root.layout.children[0].component_id"`

**Candidate Lists**:
- ✓ **Available**: `Object.keys(spec.root.nodes)` - All valid component IDs
- ✓ **Suggestion**: Could suggest closest match using string similarity

**Rich Error Potential**: HIGH
- Can list all valid component IDs
- Can suggest closest match
- Clear path to error location

---

#### Error 5.2: Component type and config type mismatch

**Location**: buildRenderTree.ts:56

**Error Message**: `'Component type and config type mismatch'`

**Context Available**:
- `componentNode.type`: The component type
- `componentNode.config.type`: The config type
- `componentId`: The component ID

**Path Construction**:
- Could show: `"Component '${componentId}' has type '${componentNode.type}' but config type '${componentNode.config.type}'"`
- Path: `"root.nodes['${componentId}']"`

**Candidate Lists**:
- ✗ **None available** - Internal consistency error

**Rich Error Potential**: MEDIUM
- Can show both types
- No suggestions (this is a spec generation error)

---

#### Error 5.3: Unsupported component type

**Location**: buildRenderTree.ts:87

**Error Message**: `` `Unsupported component type: ${componentNode.type}` ``

**Context Available**:
- `componentNode.type`: The unsupported type ('hierarchy' | 'composition' | 'text-insight')
- `componentId`: The component ID

**Path Construction**:
- Already includes type in message
- Path: `"root.nodes['${componentId}']"`

**Candidate Lists**:
- ✓ **Supported types**: `['data-table']`
- Could show: "Currently only 'data-table' is supported"

**Rich Error Potential**: MEDIUM
- Can show what's supported
- Not a user error (feature not implemented)

---

#### Error 5.4: Nested layouts not yet supported

**Location**: buildRenderTree.ts:92

**Error Message**: `'Nested layouts not yet supported'`

**Context Available**:
- `layoutChild.type`: `'layout'`
- `layoutChild`: The nested layout reference

**Path Construction**:
- Path: `"root.layout.children[0]"`

**Candidate Lists**:
- ✗ **None available** - Feature not implemented

**Rich Error Potential**: LOW
- Clear message already
- No suggestions (feature limitation)

---

#### Error 5.5: Unknown layout child type

**Location**: buildRenderTree.ts:97

**Error Message**: `` `Unknown layout child type: ${(_exhaustive as {type: string}).type}` ``

**Context Available**:
- `layoutChild`: The unknown child
- `layoutChild.type`: The unexpected type

**Path Construction**:
- Already includes type in message
- Path: `"root.layout.children[0]"`

**Candidate Lists**:
- ✓ **Valid types**: `['component', 'layout']`
- ✓ **Suggestion**: Could suggest closest match

**Rich Error Potential**: HIGH
- Can show expected types
- Can suggest alternatives

---

## Summary Analysis

### Error Categories

1. **Type Validation Errors** (7 errors)
   - `not_array`, `not_an_array`, `query_error` (validation)
   - Limited suggestion potential
   - Can show what was received vs expected

2. **Path/Accessor Errors** (4 errors)
   - `invalid_accessor`, `expected_single_value`, `no_array_property`
   - HIGH suggestion potential
   - Can fix automatically or suggest fixes

3. **Reference Errors** (3 errors)
   - Component not found, unknown types
   - HIGH suggestion potential
   - Can suggest from known valid values

4. **Requirement Errors** (2 errors)
   - `field_required`
   - MEDIUM-HIGH suggestion potential
   - Can inspect data and suggest fields

5. **Feature Limitations** (3 errors)
   - Unsupported component type, nested layouts
   - LOW suggestion potential
   - Not user errors

### Rich Error Potential by Category

**HIGH (9 errors)** - Can provide actionable suggestions:
- `no_array_property` - suggest from actual keys
- `invalid_accessor` - suggest `$` prefix
- `expected_single_value` - suggest adding index or removing wildcard
- `field_required` - suggest from data structure
- Unknown layout type - suggest valid types
- Component not found - suggest from registry
- Unknown layout child type - suggest valid types

**MEDIUM (8 errors)** - Can provide context but limited suggestions:
- `not_array` - show what was received
- `query_error` - show type mismatch
- `not_an_array` - show value at path
- Stack/Grid no children - show path
- Component type mismatch - show both types
- Unsupported component type - show what's supported

**LOW (3 errors)** - Feature limitations, already clear:
- Nested layouts not supported
- (Analysis errors are different domain)

### Available Context Patterns

**Candidates for Suggestions**:
- Object keys when checking for array properties
- Valid component IDs from nodes registry
- Valid type enums (layout types, child types)
- Data structure fields when field is required
- Accessor fix suggestions (add `$`, add index, remove wildcard)

**Path Construction Opportunities**:
- JSONPath accessors in all query functions
- Component registry paths (`root.nodes[id]`)
- Layout paths (`root.layout.children[0]`)
- Field paths when validating nested structures

**Context Data**:
- Actual vs expected types
- Array lengths
- Available vs required fields
- Valid enum values

### Recommendations for Helper Design

1. **Priority 1**: Path/Accessor errors
   - High usage frequency
   - Clear fix suggestions available
   - User errors (not feature limitations)

2. **Priority 2**: Reference errors
   - Can use string similarity for suggestions
   - Access to valid value lists

3. **Priority 3**: Requirement errors
   - Need data introspection
   - Can provide valuable suggestions

4. **Consider**: Structured error types
   - Include `path` field
   - Include `suggestions` array
   - Include `context` object with relevant data
   - Include `fixes` for auto-fixable issues

5. **Helper Functions Needed**:
   - `suggestFromList(value, validList)` - string similarity matching
   - `buildPath(...)` - construct JSONPath-style paths to errors
   - `inspectDataStructure(data, maxDepth)` - get available fields
   - `suggestAccessorFix(accessor, error)` - suggest accessor corrections
