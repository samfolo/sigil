/**
 * Common utilities for React renderer testing
 */

/**
 * Valid layout types for data-layout-type attribute
 */
export type LayoutType = 'horizontal-stack' | 'vertical-stack' | 'grid';

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
 * Finds element by data-layout-type attribute
 *
 * @param container - Container element to search within
 * @param layoutType - Type of layout to find
 * @returns Element with matching data-layout-type, or null if not found
 */
export const getByLayoutType = (container: HTMLElement, layoutType: LayoutType): HTMLElement | null => container.querySelector(`[data-layout-type="${layoutType}"]`);

/**
 * Finds all elements by data-layout-type attribute
 *
 * @param container - Container element to search within
 * @param layoutType - Type of layout to find
 * @returns Array of elements with matching data-layout-type
 */
export const getAllByLayoutType = (container: HTMLElement, layoutType: LayoutType): HTMLElement[] => Array.from(container.querySelectorAll(`[data-layout-type="${layoutType}"]`));
