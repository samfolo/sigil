import {Loader2} from 'lucide-react';
import type {ReactNode} from 'react';

import type {Fixture} from '@sigil/src/common/fixtures/schemas';

import {ErrorBox} from './ErrorBox';

interface PreviewCanvasProps {
	fixture: Fixture | undefined;
	isLoading: boolean;
	error: Error | null;
}

/**
 * Centre canvas displaying rendered fixture output
 *
 * Shows appropriate states: idle (no fixture), loading, error, or rendered output.
 * All content is centred both horizontally and vertically.
 */
export const PreviewCanvas = ({fixture, isLoading, error}: PreviewCanvasProps): ReactNode => (
	<main className="flex items-centre justify-centre bg-preview-canvas text-preview-text">
		{!fixture && !isLoading && !error && (
			<p className="text-lg opacity-60">No preview loaded</p>
		)}

		{isLoading && <Loader2 className="h-8 w-8 animate-spin" />}

		{error && <ErrorBox message={error.message} />}

		{fixture && !isLoading && !error && (
			<div className="w-full p-8 flex items-center justify-center">
				<p className="text-sm opacity-60">Rendered output will appear here</p>
			</div>
		)}
	</main>
);
