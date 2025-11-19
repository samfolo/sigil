import {Loader2} from 'lucide-react';
import type {ReactNode} from 'react';

import {render} from '@sigil/renderer/react';
import type {RunArtifact} from '@sigil/src/common/run/schemas';

import {ErrorBox} from './ErrorBox';

/**
 * Extracts error message from unknown error type
 *
 * @param error - Error of unknown type
 * @returns Error message string
 */
const getErrorMessage = (error: unknown): string => {
	if (typeof error === 'string') {
		return error;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return 'Unknown error occurred';
};

interface PreviewCanvasProps {
	run: RunArtifact | undefined;
	isLoading: boolean;
	error: unknown;
}

/**
 * Centre canvas displaying rendered run output
 *
 * Shows appropriate states: idle (no run), loading, error, or rendered output.
 * Renders the component spec using run.output and run.data.
 */
export const PreviewCanvas = ({run, isLoading, error}: PreviewCanvasProps): ReactNode => (
	<main className="flex items-center justify-center bg-preview-canvas text-preview-text">
		<div className="w-full h-full p-8 flex items-center justify-center">
			{!run && !isLoading && !error && (
				<p className="text-sm opacity-60">No preview loaded</p>
			)}

			{isLoading && <Loader2 className="h-8 w-8 animate-spin" />}

			{error ? <ErrorBox message={getErrorMessage(error)} /> : null}

			{run && !isLoading && !error && !run.output && (
				<p className="text-sm opacity-60">Run has no output (may have failed)</p>
			)}

			{run && !isLoading && !error && run.output && (
				<div className="w-full h-full overflow-auto">
					{render(run.output, run.data)}
				</div>
			)}
		</div>
	</main>
)
