'use client';

/**
 * Test page for the Sigil renderer
 *
 * Demonstrates rendering the simple-table.json example with sample data
 */

import {ComponentSpecSchema} from '@sigil/lib/generated/schemas';
import {render} from '@sigil/lib/renderer';
import simpleTableSpecJson from '@sigil/spec/examples/simple-table.json';

const simpleTableSpec = ComponentSpecSchema.parse(simpleTableSpecJson);

const Page = () => {
	// Sample data matching the simple-table spec structure
	const data = [
		{
			name: 'Alice Johnson',
			email: 'alice@example.com',
			created_at: '2024-01-15T10:30:00Z',
			status: 'active',
		},
		{
			name: 'Bob Smith',
			email: 'bob@example.com',
			created_at: '2024-02-20T14:45:00Z',
			status: 'active',
		},
		{
			name: 'Charlie Brown',
			email: 'charlie@example.com',
			created_at: '2024-03-10T09:15:00Z',
			status: 'inactive',
		},
		{
			name: 'Diana Prince',
			email: 'diana@example.com',
			created_at: '2024-04-05T16:20:00Z',
			status: 'suspended',
		},
	];

	return (
		<main className="container mx-auto py-8">
			<div className="space-y-6">
				<div className="space-y-2">
					<h1 className="text-4xl font-bold tracking-tight">Renderer Test</h1>
					<p className="text-muted-foreground">
						Testing the Sigil renderer with simple-table.json example
					</p>
				</div>

				{render(simpleTableSpec, data)}
			</div>
		</main>
	);
};

export default Page;
