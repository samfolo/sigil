import {json} from '@codemirror/lang-json';
import CodeMirror from '@uiw/react-codemirror';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import type {ReactNode} from 'react';

import type {Fixture} from '@sigil/src/common/fixtures/schemas';
import {Button} from '@sigil/src/ui/primitives/button';

export type LogsSidebarState = 'expanded' | 'closed' | 'hidden';

interface LogsSidebarProps {
	fixture: Fixture | undefined;
	state: LogsSidebarState;
	onToggle: () => void;
	isLoading: boolean;
}

const SIDEBAR_WIDTHS: Record<LogsSidebarState, number> = {
	expanded: 540,
	closed: 48,
	hidden: 0,
};

/**
 * Right sidebar displaying fixture logs with CodeMirror
 *
 * Three states: expanded (540px), closed (48px icon only), hidden (0px removed from layout).
 * Animates width transitions with 300ms ease-out.
 */
export const LogsSidebar = ({fixture, state, onToggle, isLoading}: LogsSidebarProps): ReactNode => {
	const width = SIDEBAR_WIDTHS[state];
	const showBorder = state !== 'hidden';

	return (
		<aside
			className="bg-preview-canvas text-preview-text overflow-hidden transition-all duration-300 ease-out"
			style={{
				width: `${width}px`,
				borderLeft: showBorder ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
			}}
		>
			{state === 'closed' && (
				<div className="flex h-full items-centre justify-centre">
					<Button variant="ghost" size="icon" onClick={onToggle} aria-label="Expand logs sidebar">
						<ChevronLeft className="h-5 w-5" />
					</Button>
				</div>
			)}

			{state === 'expanded' && (
				<div className="flex h-full flex-col">
					<header className="flex items-centre justify-between border-b border-white/10 px-6 py-4">
						<h2 className="font-mono text-sm">
							{fixture ? `Logs for ${fixture.displayName}` : 'Logs'}
						</h2>
						<Button
							variant="ghost"
							size="icon"
							onClick={onToggle}
							aria-label="Collapse logs sidebar"
						>
							<ChevronRight className="h-5 w-5" />
						</Button>
					</header>

					<div className="flex-1 overflow-hidden">
						{isLoading && (
							<div className="flex h-full items-centre justify-centre">
								<p className="text-sm opacity-60">Loading logs...</p>
							</div>
						)}

						{!isLoading && !fixture && (
							<div className="flex h-full items-centre justify-centre">
								<p className="text-sm opacity-60">No logs to display</p>
							</div>
						)}

						{!isLoading && fixture && fixture.logs.length === 0 && (
							<div className="flex h-full items-centre justify-centre">
								<p className="text-sm opacity-60">No logs to display</p>
							</div>
						)}

						{!isLoading && fixture && fixture.logs.length > 0 && (
							<CodeMirror
								value={JSON.stringify(fixture.logs, null, 2)}
								extensions={[json()]}
								theme="dark"
								readOnly
								basicSetup={{
									lineNumbers: false,
									foldGutter: true,
									highlightActiveLine: false,
								}}
								className="h-full"
							/>
						)}
					</div>
				</div>
			)}
		</aside>
	);
};
