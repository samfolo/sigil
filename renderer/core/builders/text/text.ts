/**
 * Builder for text primitive components
 *
 * Transforms TextConfig and raw data into TextProps ready for rendering.
 * Resolves accessor paths and applies formatting via formatTextValue.
 */

import type {SpecError} from '@sigil/src/common/errors';
import {isErr, ok} from '@sigil/src/common/errors/result';
import type {Result} from '@sigil/src/common/errors/result';
import type {TextConfig} from '@sigil/src/lib/generated/types/specification';

import type {TextProps} from '../../types';
import {formatTextValue} from '../../utils/formatTextValue';
import {querySingleValue} from '../../utils/queryJSONPath';

import type {PrimitiveBuilder} from '../types';

/**
 * Builder for text components
 *
 * Transforms TextConfig and raw data into TextProps ready for React rendering.
 * Handles accessor resolution and value formatting.
 */
export class TextBuilder implements PrimitiveBuilder<TextConfig, TextProps> {
	/**
	 * Builds TextProps from configuration and data
	 *
	 * Flow:
	 * 1. Resolve accessor path to get raw value
	 * 2. Apply formatting using formatTextValue
	 * 3. Return TextProps with config and formatted value
	 *
	 * @param config - TextConfig from validated spec
	 * @param data - Raw data to query
	 * @returns Result containing TextProps or accessor resolution errors
	 */
	build(config: TextConfig, data: unknown): Result<TextProps, SpecError[]> {
		// Resolve accessor to get raw value
		const valueResult = querySingleValue(data, config.accessor);

		if (isErr(valueResult)) {
			return valueResult;
		}

		// Apply formatting
		const formattedValue = formatTextValue(valueResult.data, config.format);

		// Extract config without type discriminator
		const {type: _type, ...configWithoutType} = config;

		return ok({
			config: configWithoutType,
			formattedValue,
		});
	}
}
