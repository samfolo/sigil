# React Component Testing

## Contents

- Selector priority
- Custom selectors
- CSS and style assertions
- Attribute testing
- General principles

## Selector Priority

Use Testing Library React. Test behaviour, not implementation.

**Priority order:**

1. **Semantic selectors** — `getByRole`, `getByText`, `getByLabelText`, `getAllByRole`
2. **Custom layout selector** — `getByLayoutType` from `@sigil/renderer/react/common`
3. **Absence checks** — `queryBy*` variants
4. **Last resort** — `getByTestId`
5. **Never use** — `getElementById`, `querySelector`, `getByClass`

If semantic selectors don't work, the component likely needs better semantic HTML or ARIA attributes. `data-testid` indicates missing accessibility.

## Semantic Selectors

```typescript
// Role with accessible name
expect(screen.getByRole('columnheader', {name: 'Full Name'})).toBeInTheDocument();

// Table structure
expect(screen.getByRole('table')).toBeInTheDocument();

// Text content
expect(screen.getByText('Alice Johnson')).toBeInTheDocument();

// Absence
expect(screen.queryByText('active')).not.toBeInTheDocument();
```

## Custom Layout Selector

For Sigil layout components:

```typescript
import {getByLayoutType} from '@sigil/renderer/react/common';

const stackDiv = getByLayoutType(container, 'horizontal-stack');
expect(stackDiv).toBeInTheDocument();
```

## CSS and Style Assertions

Only test styling when it's functional behaviour. Given the project's nature (IR → rendered UI), applied styles may be the behaviour under test.

### Class Assertions

```typescript
expect(stackDiv).toHaveClass('flex', 'flex-row');

// Negative - verify class NOT applied
Object.values(ALIGNMENT_CLASS_MAP).forEach((className) => {
  expect(stackDiv).not.toHaveClass(className);
});
```

### Inline Style Assertions

```typescript
expect(getByLayoutType(container, 'grid')).toHaveStyle({
  gridTemplateColumns: 'repeat(3, 1fr)',
});
```

## Attribute Testing

```typescript
expect(nameHeader).toHaveAttribute('scope', 'col');
expect(table.getAttribute('aria-describedby')).toBeTruthy();
```

## General Principles

**Test what users see and interact with.** Not internal state, not implementation details.

**Test edge cases:** null, undefined, empty arrays, missing props.

**Choose visibility assertions deliberately:**
- `toBeVisible()` — Element is rendered AND visible to user
- `toBeInTheDocument()` — Element exists in DOM (may be hidden)

**Avoid snapshot testing.** Historically unreliable, unclear failures.

**No `fireEvent` or `userEvent` yet.** Current tests focus on render output. Interaction testing patterns will evolve as the frontend develops.

## Import Organisation

```typescript
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';

import type {ComponentSpec} from '@sigil/spec';
import {getByLayoutType} from '@sigil/renderer/react/common';

import {SIMPLE_SPEC, SIMPLE_DATA} from './Component.fixtures';
```
