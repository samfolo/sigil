import {json} from '@codemirror/lang-json';
import {codeFolding, foldAll, foldGutter, HighlightStyle, syntaxHighlighting, unfoldAll} from '@codemirror/language';
import type {EditorState} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {tags} from '@lezer/highlight';
import CodeMirror from '@uiw/react-codemirror';
import {ChevronLeft, ChevronRight, FoldVertical, UnfoldVertical} from 'lucide-react';
import type {ReactNode} from 'react';
import {useState} from 'react';

import type {RunArtifact} from '@sigil/src/common/run/schemas';
import {Button} from '@sigil/src/ui/primitives/button';

const SIDEBAR_THEME = EditorView.theme(
	{
		'&': {
			backgroundColor: 'oklch(0 0 0)',
			color: 'oklch(0.7 0 0)',
		},
		'.cm-content': {
			backgroundColor: 'oklch(0 0 0)',
			caretColor: 'oklch(1 0 0)',
		},
		'.cm-cursor, .cm-dropCursor': {
			borderLeftColor: 'oklch(1 0 0)',
		},
		'&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
			backgroundColor: 'oklch(0.3 0 0)',
		},
		'.cm-matchingBracket, .cm-nonmatchingBracket': {
			backgroundColor: 'oklch(0.2 0 0)',
			outline: '1px solid oklch(0.4 0 0)',
		},
		'.cm-selectionBackground': {
			backgroundColor: 'oklch(0.3 0 0)',
		},
		'::selection': {
			backgroundColor: 'oklch(0.3 0 0)',
		},
		'.cm-selectionMatch': {
			backgroundColor: 'oklch(0.25 0 0)',
			outline: '1px solid oklch(0.4 0 0)',
		},
		'.cm-searchMatch': {
			backgroundColor: 'oklch(0.2 0 0)',
			outline: '1px solid oklch(0.35 0 0)',
		},
		'.cm-searchMatch-selected': {
			backgroundColor: 'oklch(0.3 0 0)',
			outline: '1px solid oklch(0.5 0 0)',
		},
		'.cm-activeLine': {
			backgroundColor: 'transparent',
		},
		'.cm-activeLineGutter': {
			backgroundColor: 'oklch(0.1 0 0)',
		},
		'.cm-gutters': {
			backgroundColor: 'oklch(0 0 0)',
			color: 'oklch(0.5 0 0)',
			border: 'none',
		},
		'.cm-foldGutter': {
			color: 'oklch(0.5 0 0)',
		},
		'.cm-foldPlaceholder': {
			backgroundColor: 'oklch(0.15 0 0)',
			border: '1px solid oklch(0.3 0 0)',
			borderRadius: '3px',
			padding: '0 4px',
			margin: '0 2px',
			cursor: 'pointer',
		},
	},
	{dark: true}
);

const MONOCHROME_HIGHLIGHTING = syntaxHighlighting(
	HighlightStyle.define([
		{tag: tags.keyword, color: 'oklch(0.7 0 0)'},
		{tag: tags.propertyName, color: 'oklch(0.7 0 0)'},
		{tag: tags.string, color: 'oklch(0.6 0 0)'},
		{tag: tags.number, color: 'oklch(0.6 0 0)'},
		{tag: tags.bool, color: 'oklch(0.6 0 0)'},
		{tag: tags.null, color: 'oklch(0.5 0 0)'},
		{tag: tags.punctuation, color: 'oklch(0.4 0 0)'},
		{tag: tags.bracket, color: 'oklch(0.5 0 0)'},
		{tag: tags.brace, color: 'oklch(0.5 0 0)'},
		{tag: tags.comment, color: 'oklch(0.4 0 0)', fontStyle: 'italic'},
	])
);

/**
 * Formats logs as individual JSON objects instead of an array
 */
const formatLogsAsObjects = (logs: unknown[]): string => logs.map((log) => JSON.stringify(log, null, 2)).join('\n');

/**
 * Extracts event key from folded JSON log object
 */
const prepareFoldPlaceholder = (state: EditorState, range: {from: number; to: number}) => {
	const text = state.doc.sliceString(range.from, range.to);

	try {
		// Try parsing as-is first (complete object)
		const parsed = JSON.parse(text);
		if (parsed && typeof parsed === 'object' && 'event' in parsed) {
			return parsed.event;
		}
	} catch {
		// If direct parsing fails, try wrapping in braces (object contents only)
		try {
			const parsed = JSON.parse(`{${text}}`);
			if (parsed && typeof parsed === 'object' && 'event' in parsed) {
				return parsed.event;
			}
		} catch {
			// If both fail, return null
		}
	}

	return null;
};

/**
 * Renders fold placeholder with event key if available
 */
const customFoldPlaceholder = (view: EditorView, onclick: (event: Event) => void, prepared: string | null) => {
	const element = document.createElement('span');
	element.className = 'cm-foldPlaceholder';
	element.textContent = prepared ? `event: "${prepared}", ...` : '...';
	element.onclick = onclick;

	return element;
};

const CUSTOM_FOLDING = codeFolding({
	preparePlaceholder: prepareFoldPlaceholder,
	placeholderDOM: customFoldPlaceholder,
});

export type LogsSidebarState = 'expanded' | 'closed' | 'hidden';

interface LogsSidebarProps {
	run: RunArtifact | undefined;
	state: LogsSidebarState;
	onToggle: () => void;
	isLoading: boolean;
}

const SIDEBAR_WIDTHS: Record<LogsSidebarState, number> = {
	expanded: 480,
	closed: 68,
	hidden: 0,
};

/**
 * Right sidebar displaying run logs with CodeMirror
 *
 * Three states: expanded (480px), closed (48px icon only), hidden (0px removed from layout).
 * Animates width transitions with 300ms ease-out.
 */
export const LogsSidebar = ({run, state, onToggle, isLoading}: LogsSidebarProps): ReactNode => {
	const width = SIDEBAR_WIDTHS[state];
	const showBorder = state !== 'hidden';
	const isExpanded = state === 'expanded';
	const [editorView, setEditorView] = useState<EditorView | null>(null);

	const handleFoldAll = () => {
		if (editorView) {
			foldAll(editorView);
		}
	};

	const handleExpandAll = () => {
		if (editorView) {
			unfoldAll(editorView);
		}
	};

	return (
		<aside
			className="bg-preview-canvas text-preview-text h-screen overflow-hidden transition-all duration-300 ease-out"
			style={{
				width: `${width}px`,
				borderLeft: showBorder ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
			}}
		>
			<div className="flex h-full flex-col">
				<header
					className={`flex shrink-0 items-centre border-b items-center px-4 py-2 ${
						isExpanded
							? 'justify-between border-white/10'
							: 'justify-end border-transparent'
					}`}
				>
					<h2
						className={`font-mono text-sm ${
							isExpanded ? 'opacity-100 transition-opacity duration-200 delay-300' : 'opacity-0'
						}`}
					>
						Logs
					</h2>
					<div className="flex gap-2">
						{isExpanded && editorView && (
							<>
								<Button
									variant="ghost"
									size="icon"
									onClick={handleFoldAll}
									aria-label="Fold all logs"
									className="transition-opacity duration-200 delay-300"
								>
									<FoldVertical className="h-5 w-5" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={handleExpandAll}
									aria-label="Expand all folds"
									className="transition-opacity duration-200 delay-300"
								>
									<UnfoldVertical className="h-5 w-5" />
								</Button>
							</>
						)}
						<Button
							variant="ghost"
							size="icon"
							onClick={onToggle}
							aria-label={isExpanded ? 'Collapse logs sidebar' : 'Expand logs sidebar'}
						>
							{isExpanded ? (
								<ChevronRight className="h-5 w-5" />
							) : (
								<ChevronLeft className="h-5 w-5" />
							)}
						</Button>
					</div>
				</header>

				{isExpanded && (
					<div className="flex-1 overflow-hidden">
						{isLoading && (
							<div className="flex h-full items-centre justify-centre">
								<p className="text-sm opacity-60">Loading logs...</p>
							</div>
						)}

						{!isLoading && !run && (
							<div className="flex h-full items-centre justify-centre">
								<p className="text-sm opacity-60">No logs to display</p>
							</div>
						)}

						{!isLoading && run && run.logs.length === 0 && (
							<div className="flex h-full items-centre justify-centre">
								<p className="text-sm opacity-60">No logs to display</p>
							</div>
						)}

						{!isLoading && run && run.logs.length > 0 && (
							<div className="h-full overflow-auto">
								<CodeMirror
									value={formatLogsAsObjects(run.logs)}
									extensions={[
										json(),
										EditorView.lineWrapping,
										SIDEBAR_THEME,
										MONOCHROME_HIGHLIGHTING,
										CUSTOM_FOLDING,
										foldGutter(),
									]}
									readOnly
									basicSetup={{
										lineNumbers: false,
										foldGutter: false,
										highlightActiveLine: false,
									}}
									onCreateEditor={(view) => {
										setEditorView(view);
									}}
								/>
							</div>
						)}
					</div>
				)}
			</div>
		</aside>
	);
};
