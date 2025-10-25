/**
 * Component Preview Page
 *
 * Development tool for iterating on component design with different fixtures.
 * Provides a sidebar to select component types and fixtures, then renders them.
 *
 * This is a development-only route, isolated from the main app.
 */

'use client';

import {useState} from 'react';

import {render} from '@sigil/renderer/react';

import {PreviewLayout} from './components/PreviewLayout';
import {dataTableFixtures} from './fixtures/dataTable.fixtures';

const PreviewPage = () => {
	const [selectedFixtureId, setSelectedFixtureId] = useState<string>(dataTableFixtures.at(0)?.id ?? '');

	// Find the selected fixture
	const selectedFixture = dataTableFixtures.find((f) => f.id === selectedFixtureId) ?? dataTableFixtures.at(0);

	// Sidebar content - component type and fixture selection
	const sidebar = (
		<div className="space-y-6">
			{/* Component Type Section */}
			<div className="space-y-2">
				<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Component Type</h2>
				<div className="px-3 py-2 rounded-md bg-background border border-border">
					<div className="text-sm font-medium">Data Table</div>
					<div className="text-xs text-muted-foreground mt-1">Tabular data display</div>
				</div>
			</div>

			{/* Fixture Selection */}
			<div className="space-y-2">
				<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Fixtures</h2>
				<div className="space-y-1">
					{dataTableFixtures.map((fixture) => (
						<button
							key={fixture.id}
							onClick={() => setSelectedFixtureId(fixture.id)}
							className={`
                w-full text-left px-3 py-2 rounded-md transition-colours
                ${
						selectedFixtureId === fixture.id
							? 'bg-primary text-primary-foreground'
							: 'hover:bg-muted bg-background border border-border'
						}
              `}
						>
							<div className="text-sm font-medium">{fixture.name}</div>
							<div
								className={`text-xs mt-1 ${
									selectedFixtureId === fixture.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
								}`}
							>
								{fixture.description}
							</div>
						</button>
					))}
				</div>
			</div>

			{/* Selected Fixture Info */}
			{selectedFixture && (
				<div className="space-y-2 pt-4 border-t border-border">
					<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Details</h2>
					<div className="space-y-1 text-xs text-muted-foreground">
						<div>
							<span className="font-medium">Rows:</span> {(selectedFixture.data as unknown[]).length}
						</div>
						<div>
							<span className="font-medium">Spec ID:</span> {selectedFixture.spec.id}
						</div>
					</div>
				</div>
			)}
		</div>
	);

	// Main content - render the selected component
	const content = selectedFixture ? (
		<div className="space-y-4">
			{/* Fixture header */}
			<div className="space-y-1 pb-4 border-b border-border">
				<h1 className="text-3xl font-bold tracking-tight">{selectedFixture.name}</h1>
				<p className="text-muted-foreground">{selectedFixture.description}</p>
			</div>

			{/* Rendered component */}
			<div className="pt-2">{render(selectedFixture.spec, selectedFixture.data)}</div>
		</div>
	) : (
		<div className="flex items-centre justify-centre h-full">
			<p className="text-muted-foreground">No fixture selected</p>
		</div>
	);

	return <PreviewLayout sidebar={sidebar} content={content} />;
};

export default PreviewPage;
