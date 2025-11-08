import type {ReactNode} from 'react';

interface ErrorBoxProps {
	message: string;
}

/**
 * Error display box for preview errors
 *
 * Displays error messages in a styled box with red background and border,
 * centred within its container.
 */
export const ErrorBox = ({message}: ErrorBoxProps): ReactNode => (
	<div className="flex items-centre justify-centre w-full h-full">
		<div className="max-w-[600px] rounded-lg border border-preview-error-border bg-preview-error-bg px-6 py-4 text-preview-error-text">
			{message}
		</div>
	</div>
);
