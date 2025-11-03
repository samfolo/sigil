import type Anthropic from '@anthropic-ai/sdk';
import {describe, expect, it} from 'vitest';

import {addCacheControlToHistory} from '../runIterationLoop';

describe('addCacheControlToHistory', () => {
	describe('Edge Cases', () => {
		it('should return empty array for empty conversation history', () => {
			const history: Anthropic.MessageParam[] = [];
			const result = addCacheControlToHistory(history);

			expect(result).toEqual([]);
			expect(result).toBe(history); // Same reference since no changes needed
		});

		it('should return original history if no user message found', () => {
			const history: Anthropic.MessageParam[] = [
				{
					role: 'assistant',
					content: [{type: 'text', text: 'Hello'}],
				},
			];
			const result = addCacheControlToHistory(history);

			expect(result).toBe(history); // Same reference since no changes needed
		});
	});

	describe('String Content Handling', () => {
		it('should convert string content to array and add cache_control', () => {
			const history: Anthropic.MessageParam[] = [
				{
					role: 'user',
					content: 'Hello, Claude!',
				},
			];
			const result = addCacheControlToHistory(history);

			expect(result).not.toBe(history); // Should be a new array
			expect(result).toHaveLength(1);
			expect(result.at(0)).toMatchObject({
				role: 'user',
				content: [
					{
						type: 'text',
						text: 'Hello, Claude!',
						cache_control: {type: 'ephemeral'},
					},
				],
			});
		});
	});

	describe('Array Content Handling', () => {
		it('should add cache_control to last content block', () => {
			const history: Anthropic.MessageParam[] = [
				{
					role: 'user',
					content: [
						{type: 'text', text: 'First block'},
						{type: 'text', text: 'Second block'},
					],
				},
			];
			const result = addCacheControlToHistory(history);

			expect(result).not.toBe(history); // Should be a new array
			expect(result).toHaveLength(1);
			const message = result.at(0);
			expect(Array.isArray(message?.content)).toBe(true);

			if (message && Array.isArray(message.content)) {
				expect(message.content).toHaveLength(2);
				expect(message.content.at(0)).toEqual({type: 'text', text: 'First block'});
				expect(message.content.at(1)).toEqual({
					type: 'text',
					text: 'Second block',
					cache_control: {type: 'ephemeral'},
				});
			}
		});

		it('should handle tool result content blocks', () => {
			const history: Anthropic.MessageParam[] = [
				{
					role: 'user',
					content: [
						{
							type: 'tool_result',
							tool_use_id: 'tool_123',
							content: 'Tool output',
						},
					],
				},
			];
			const result = addCacheControlToHistory(history);

			expect(result).not.toBe(history);
			const message = result.at(0);
			if (message && Array.isArray(message.content)) {
				expect(message.content.at(0)).toEqual({
					type: 'tool_result',
					tool_use_id: 'tool_123',
					content: 'Tool output',
					cache_control: {type: 'ephemeral'},
				});
			}
		});
	});

	describe('Last User Message Detection', () => {
		it('should find last user message when last message is assistant', () => {
			const history: Anthropic.MessageParam[] = [
				{
					role: 'user',
					content: 'First user message',
				},
				{
					role: 'assistant',
					content: [{type: 'text', text: 'Assistant response'}],
				},
			];
			const result = addCacheControlToHistory(history);

			expect(result).toHaveLength(2);
			// First message should have cache_control
			const firstMessage = result.at(0);
			expect(firstMessage?.role).toBe('user');
			if (firstMessage && Array.isArray(firstMessage.content)) {
				expect(firstMessage.content.at(0)).toMatchObject({
					cache_control: {type: 'ephemeral'},
				});
			}
			// Second message should be unchanged
			expect(result.at(1)).toEqual(history.at(1));
		});

		it('should find last user message in multi-turn conversation', () => {
			const history: Anthropic.MessageParam[] = [
				{
					role: 'user',
					content: 'First user message',
				},
				{
					role: 'assistant',
					content: [{type: 'text', text: 'Assistant response 1'}],
				},
				{
					role: 'user',
					content: 'Second user message',
				},
				{
					role: 'assistant',
					content: [{type: 'text', text: 'Assistant response 2'}],
				},
			];
			const result = addCacheControlToHistory(history);

			expect(result).toHaveLength(4);
			// Third message (last user) should have cache_control
			const lastUserMessage = result.at(2);
			expect(lastUserMessage?.role).toBe('user');
			if (lastUserMessage && Array.isArray(lastUserMessage.content)) {
				expect(lastUserMessage.content.at(0)).toMatchObject({
					cache_control: {type: 'ephemeral'},
				});
			}
			// Other messages should be unchanged
			expect(result.at(0)).toEqual(history.at(0));
			expect(result.at(1)).toEqual(history.at(1));
			expect(result.at(3)).toEqual(history.at(3));
		});
	});

	describe('Immutability', () => {
		it('should not mutate original history array', () => {
			const history: Anthropic.MessageParam[] = [
				{
					role: 'user',
					content: 'Original message',
				},
			];
			const originalHistory = [...history]; // Keep a copy
			const result = addCacheControlToHistory(history);

			// Original history should be unchanged
			expect(history).toEqual(originalHistory);
			expect(history).not.toBe(result);
		});

		it('should not mutate original message objects', () => {
			const message: Anthropic.MessageParam = {
				role: 'user',
				content: [{type: 'text', text: 'Original'}],
			};
			const history: Anthropic.MessageParam[] = [message];
			const result = addCacheControlToHistory(history);

			// Original message should be unchanged
			expect(message.content).toEqual([{type: 'text', text: 'Original'}]);
			expect(result.at(0)).not.toBe(message);
		});

		it('should not mutate original content array', () => {
			const content: Anthropic.Messages.ContentBlock[] = [
				{type: 'text', text: 'Original'},
			];
			const history: Anthropic.MessageParam[] = [
				{
					role: 'user',
					content,
				},
			];
			const result = addCacheControlToHistory(history);

			// Original content array should be unchanged
			expect(content).toEqual([{type: 'text', text: 'Original'}]);
			const resultMessage = result.at(0);
			if (resultMessage && Array.isArray(resultMessage.content)) {
				expect(resultMessage.content).not.toBe(content);
			}
		});
	});

	describe('Real-world Scenarios', () => {
		it('should handle typical iteration loop history', () => {
			const history: Anthropic.MessageParam[] = [
				{
					role: 'user',
					content: 'Initial prompt',
				},
				{
					role: 'assistant',
					content: [
						{type: 'text', text: 'Thinking...'},
						{
							type: 'tool_use',
							id: 'tool_1',
							name: 'helper',
							input: {query: 'test'},
						},
					],
				},
				{
					role: 'user',
					content: [
						{
							type: 'tool_result',
							tool_use_id: 'tool_1',
							content: 'Helper result',
						},
					],
				},
			];
			const result = addCacheControlToHistory(history);

			expect(result).toHaveLength(3);
			// Last user message (tool results) should have cache_control
			const lastMessage = result.at(2);
			expect(lastMessage?.role).toBe('user');
			if (lastMessage && Array.isArray(lastMessage.content)) {
				expect(lastMessage.content.at(0)).toMatchObject({
					type: 'tool_result',
					cache_control: {type: 'ephemeral'},
				});
			}
		});
	});
});
