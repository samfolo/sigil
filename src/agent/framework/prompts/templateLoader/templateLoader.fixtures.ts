import type {AgentExecutionState} from '@sigil/src/agent/framework/types';

/**
 * Sample data types for testing templates
 */
export interface SimpleData {
  message: string;
}

export interface QueryData {
  query: string;
}

export interface ListData {
  items: string[];
}

/**
 * Standard execution states for testing
 */
export const FIRST_ATTEMPT_STATE: AgentExecutionState = {
	attempt: 1,
	maxAttempts: 3,
};

export const SECOND_ATTEMPT_STATE: AgentExecutionState = {
	attempt: 2,
	maxAttempts: 3,
};

export const FINAL_ATTEMPT_STATE: AgentExecutionState = {
	attempt: 3,
	maxAttempts: 3,
};

/**
 * Sample data for testing
 */
export const SIMPLE_DATA: SimpleData = {
	message: 'Hello, world!',
};

export const QUERY_DATA: QueryData = {
	query: 'Analyse sales data',
};

export const LIST_DATA: ListData = {
	items: ['first', 'second', 'third'],
};

/**
 * Template strings for inline compilation tests
 * Keep these in sync with the corresponding .liquid files in __fixtures__/
 */
export const SIMPLE_TEMPLATE = 'Process: {{ data }}';
export const SIMPLE_TEMPLATE_FILE = 'simple.liquid';

export const WITH_STATE_TEMPLATE = 'Attempt {{ state.attempt }}/{{ state.maxAttempts }}: {{ data.message }}';
export const WITH_STATE_TEMPLATE_FILE = 'withState.liquid';

export const ERROR_TEMPLATE = `Attempt {{ state.attempt }}/{{ state.maxAttempts }} failed:

{{ data }}

Please fix these issues.`;

export const CONDITIONAL_TEMPLATE = `{% if state.attempt == 1 %}
First attempt: {{ data.query }}
{% else %}
Attempt {{ state.attempt }}/{{ state.maxAttempts }}: {{ data.query }}
{% endif %}`;
export const CONDITIONAL_TEMPLATE_FILE = 'conditional.liquid';

export const LOOP_TEMPLATE = `Items to process:
{% for item in data.items %}
- {{ item }}
{% endfor %}`;
export const LOOP_TEMPLATE_FILE = 'loop.liquid';

/**
 * Invalid template for testing error handling
 */
export const INVALID_TEMPLATE = '{{ unclosed tag';
