import {describe, expect, it} from 'vitest';

import {isOk} from '@sigil/src/common/errors';

import {parseXML} from './parseXML';
import {ATTRIBUTE_PREFIX, FRAGMENT_SENTINEL, MAX_DEPTH, MAX_TAG_NAME_LENGTH, MAX_TOP_LEVEL_TAGS, TEXT_NODE_KEY} from './types';

/**
 * Helper to create attribute key with proper prefix
 */
const attr = (name: string): string => `${ATTRIBUTE_PREFIX}${name}`;

describe('parseXML', () => {
	describe('invalid XML', () => {
		it('returns valid: false for empty string', () => {
			const result = parseXML('');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(false);
			if (result.data.valid) {
				return;
			}

			expect(result.data.error).toBeTruthy();
			expect(typeof result.data.error).toBe('string');
		});

		it('returns valid: false for completely malformed XML', () => {
			const result = parseXML('<<>>invalid<<');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(false);
		});

		it('returns valid: false for plain text without tags', () => {
			const result = parseXML('just plain text');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(false);
		});
	});

	describe('single root element', () => {
		it('parses simple self-closing root', () => {
			const result = parseXML('<root/>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rootElement).toBe('root');
			expect(metadata.topLevelNodeTags).toEqual([]);
			expect(metadata.depth.value).toBe(1);
			expect(metadata.depth.exact).toBe(true);
		});

		it('parses simple root with children', () => {
			const result = parseXML('<root><child1/><child2/></root>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rootElement).toBe('root');
			expect(metadata.topLevelNodeTags).toHaveLength(2);
			expect(metadata.topLevelNodeTags.at(0)?.value).toBe('child1');
			expect(metadata.topLevelNodeTags.at(1)?.value).toBe('child2');
		});

		it('preserves document order for child tags', () => {
			const result = parseXML('<root><zebra/><apple/><monkey/></root>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.topLevelNodeTags.map((t) => t.value)).toEqual([
				'zebra',
				'apple',
				'monkey',
			]);
		});

		it('parses nested XML structure', () => {
			const result = parseXML('<root><level1><level2><level3/></level2></level1></root>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rootElement).toBe('root');
			expect(metadata.depth.value).toBe(4);
			expect(metadata.depth.exact).toBe(true);
		});
	});

	describe('multiple root elements (fragments)', () => {
		it('parses two root elements as fragment', () => {
			const result = parseXML('<item1/><item2/>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rootElement).toBe(FRAGMENT_SENTINEL);
			expect(metadata.topLevelNodeTags).toHaveLength(2);
			expect(metadata.topLevelNodeTags.at(0)?.value).toBe('item1');
			expect(metadata.topLevelNodeTags.at(1)?.value).toBe('item2');
		});

		it('parses multiple root elements as fragment', () => {
			const result = parseXML('<a/><b/><c/><d/>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rootElement).toBe(FRAGMENT_SENTINEL);
			expect(metadata.topLevelNodeTags).toHaveLength(4);
		});
	});

	describe('text content', () => {
		it('parses text-only element', () => {
			const result = parseXML('<root>text content</root>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rootElement).toBe('root');
			expect(metadata.topLevelNodeTags).toEqual([]);
		});

		it('parses mixed content with text and elements', () => {
			const result = parseXML('<root>text<child/>more text</root>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rootElement).toBe('root');
			expect(metadata.topLevelNodeTags).toHaveLength(1);
			expect(metadata.topLevelNodeTags.at(0)?.value).toBe('child');
		});

		it('filters out text node key from top-level tags', () => {
			const result = parseXML('<root>text<child1/><child2/></root>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.topLevelNodeTags).toHaveLength(2);
			expect(metadata.topLevelNodeTags.map((t) => t.value)).not.toContain(TEXT_NODE_KEY);
		});
	});

	describe('attributes', () => {
		it('parses element with single attribute', () => {
			const result = parseXML('<root id="123"/>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rootElement).toBe('root');
			expect(metadata.topLevelNodeTags).toEqual([]);
		});

		it('parses element with multiple attributes', () => {
			const result = parseXML('<root id="123" class="foo" data-value="bar"/>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rootElement).toBe('root');
		});

		it('filters out attribute keys from top-level tags', () => {
			const result = parseXML('<root id="123"><child class="foo"/></root>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.topLevelNodeTags).toHaveLength(1);
			expect(metadata.topLevelNodeTags.at(0)?.value).toBe('child');
			expect(metadata.topLevelNodeTags.map((t) => t.value)).not.toContain(attr('id'));
			expect(metadata.topLevelNodeTags.map((t) => t.value)).not.toContain(attr('class'));
		});
	});

	describe('namespaces', () => {
		it('preserves namespace prefixes in tag names', () => {
			const result = parseXML('<ns:root><ns:child/></ns:root>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rootElement).toBe('ns:root');
			expect(metadata.topLevelNodeTags.at(0)?.value).toBe('ns:child');
		});

		it('handles multiple namespaces', () => {
			const result = parseXML('<a:root><b:child1/><c:child2/></a:root>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rootElement).toBe('a:root');
			expect(metadata.topLevelNodeTags).toHaveLength(2);
		});
	});

	describe('repeated tags', () => {
		it('handles repeated child elements', () => {
			const result = parseXML('<root><item/><item/><item/></root>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.topLevelNodeTags).toHaveLength(1);
			expect(metadata.topLevelNodeTags.at(0)?.value).toBe('item');
		});

		it('handles mix of repeated and unique tags', () => {
			const result = parseXML('<root><item/><item/><other/></root>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.topLevelNodeTags).toHaveLength(2);
			expect(metadata.topLevelNodeTags.at(0)?.value).toBe('item');
			expect(metadata.topLevelNodeTags.at(1)?.value).toBe('other');
		});
	});

	describe('depth calculation', () => {
		it('calculates depth 1 for self-closing root', () => {
			const result = parseXML('<root/>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.depth.value).toBe(1);
			expect(metadata.depth.exact).toBe(true);
		});

		it('calculates depth for nested elements', () => {
			const result = parseXML('<a><b><c><d/></c></b></a>');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.depth.value).toBe(4);
			expect(metadata.depth.exact).toBe(true);
		});

		it('sets exact: false when depth exceeds MAX_DEPTH', () => {
			// Create deeply nested XML exceeding MAX_DEPTH
			const tags = Array.from({length: MAX_DEPTH + 5}, (_, i) => `level${i}`);
			const opening = tags.map((tag) => `<${tag}>`).join('');
			const closing = tags.reverse().map((tag) => `</${tag}>`).join('');
			const xml = opening + closing;

			const result = parseXML(xml);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.depth.value).toBe(MAX_DEPTH);
			expect(metadata.depth.exact).toBe(false);
		});

		it('sets exact: true when depth equals MAX_DEPTH', () => {
			// Create XML with exactly MAX_DEPTH levels
			const tags = Array.from({length: MAX_DEPTH}, (_, i) => `level${i}`);
			const opening = tags.map((tag) => `<${tag}>`).join('');
			const closing = tags.reverse().map((tag) => `</${tag}>`).join('');
			const xml = opening + closing;

			const result = parseXML(xml);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.depth.value).toBe(MAX_DEPTH);
			expect(metadata.depth.exact).toBe(true);
		});
	});

	describe('size calculation', () => {
		it('calculates size from raw input string', () => {
			const rawData = '<root><child/></root>';
			const result = parseXML(rawData);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.size.characters).toBe(rawData.length);
			expect(metadata.size.bytes).toBeGreaterThan(0);
			expect(metadata.size.lines).toBe(1);
		});

		it('calculates size for multi-line XML', () => {
			const rawData = `<root>
  <child/>
</root>`;
			const result = parseXML(rawData);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.size.characters).toBe(rawData.length);
			expect(metadata.size.lines).toBe(3);
		});
	});

	describe('capping and truncation', () => {
		it('caps top-level tags at MAX_TOP_LEVEL_TAGS', () => {
			const tags = Array.from({length: MAX_TOP_LEVEL_TAGS * 2}, (_, i) => `<child${i}/>`);
			const xml = `<root>${tags.join('')}</root>`;

			const result = parseXML(xml);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.topLevelNodeTags).toHaveLength(MAX_TOP_LEVEL_TAGS);
		});

		it('truncates tag names longer than MAX_TAG_NAME_LENGTH', () => {
			const longTag = 'a'.repeat(MAX_TAG_NAME_LENGTH + 50);
			const xml = `<root><${longTag}/></root>`;

			const result = parseXML(xml);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.topLevelNodeTags).toHaveLength(1);
			expect(metadata.topLevelNodeTags.at(0)?.exact).toBe(false);
			expect(metadata.topLevelNodeTags.at(0)?.value).toHaveLength(MAX_TAG_NAME_LENGTH);
		});
	});

	describe('always returns Ok', () => {
		it('never returns Err for invalid input', () => {
			expect(isOk(parseXML('<invalid>'))).toBe(true);
			expect(isOk(parseXML(''))).toBe(true);
			expect(isOk(parseXML('not xml'))).toBe(true);
		});

		it('never returns Err for valid input', () => {
			expect(isOk(parseXML('<root/>'))).toBe(true);
			expect(isOk(parseXML('<a/><b/>'))).toBe(true);
		});
	});

	describe('real-world XML examples', () => {
		it('parses SVG document', () => {
			const svg = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>';
			const result = parseXML(svg);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rootElement).toBe('svg');
			expect(metadata.topLevelNodeTags.at(0)?.value).toBe('circle');
		});

		it('parses RSS feed structure', () => {
			const rss = '<rss version="2.0"><channel><title>Feed</title><item><title>Post</title></item></channel></rss>';
			const result = parseXML(rss);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rootElement).toBe('rss');
		});
	});
});
