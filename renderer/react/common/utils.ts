/**
 * Common utilities for React renderer testing
 */

/**
 * Valid element types for data-element-type attribute
 *
 * Includes layout types (horizontal-stack, vertical-stack, grid) and
 * component types (text) for test selection.
 */
export type ElementType = 'horizontal-stack' | 'vertical-stack' | 'grid' | 'grid-child' | 'text';

/**
 * Type-preserving Object.entries wrapper
 *
 * TypeScript's Object.entries returns [string, V][] which loses literal key types.
 * This wrapper preserves key-value relationships.
 */
export const objectToEntries = <Key extends string, Value>(
	obj: Record<Key, Value>
): [Key, Value][] => Object.entries(obj) as [Key, Value][];

/**
 * Finds element by data-element-type attribute
 *
 * @param container - Container element to search within
 * @param elementType - Type of element to find
 * @returns Element with matching data-element-type, or null if not found
 */
export const getByElementType = (container: HTMLElement, elementType: ElementType): HTMLElement | null => container.querySelector(`[data-element-type="${elementType}"]`);

/**
 * Finds all elements by data-element-type attribute
 *
 * @param container - Container element to search within
 * @param elementType - Type of element to find
 * @returns Array of elements with matching data-element-type
 */
export const getAllByElementType = (container: HTMLElement, elementType: ElementType): HTMLElement[] => Array.from(container.querySelectorAll(`[data-element-type="${elementType}"]`));
