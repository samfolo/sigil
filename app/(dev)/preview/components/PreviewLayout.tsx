/**
 * PreviewLayout Component
 *
 * Layout for component preview screen with sidebar selection and content area.
 * Used only for development iteration, not part of production app.
 */

'use client';

import type {ReactNode} from 'react';

interface PreviewLayoutProps {
	sidebar: ReactNode;
	content: ReactNode;
}

/**
 * Two-column layout with fixed sidebar and flexible content area
 */
export const PreviewLayout = ({sidebar, content}: PreviewLayoutProps): ReactNode => (
		<div className="flex h-screen">
			{/* Sidebar - fixed width, scrollable */}
			<aside className="w-64 border-r border-border bg-muted/40 overflow-y-auto">
				<div className="p-4">{sidebar}</div>
			</aside>

			{/* Main content - flexible width, scrollable */}
			<main className="flex-1 overflow-y-auto">
				<div className="container mx-auto py-8 px-6">{content}</div>
			</main>
		</div>
	);
