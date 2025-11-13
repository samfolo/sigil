import {Loader2} from 'lucide-react';
import type {ReactNode} from 'react';

import type {RunArtifact} from '@sigil/src/common/run/schemas';
import {Button} from '@sigil/src/ui/primitives/button';
import {ScrollArea} from '@sigil/src/ui/primitives/scroll-area';

import {ErrorBox} from './ErrorBox';

interface FixtureSidebarProps {
	runs: RunArtifact[] | undefined;
	selectedId: string | null;
	onSelectFixture: (id: string) => void;
	isLoading: boolean;
	error: Error | null;
}

/**
 * Left sidebar displaying run artifact list
 *
 * Single section with sticky header showing all available runs sorted chronologically.
 */
export const FixtureSidebar = ({
	runs,
	selectedId,
	onSelectFixture,
	isLoading,
	error,
}: FixtureSidebarProps): ReactNode => (
	<aside className="w-[320px] bg-preview-sidebar text-preview-text">
		<header className="px-6 py-6 bg-preview-sidebar">
			<h1 className="text-xl font-semibold">Preview</h1>
		</header>

		<ScrollArea className="h-[calc(100vh-76px)]">
			<div className="w-[320px]">
				<section>
					<div className="sticky top-0 bg-preview-sidebar px-6 py-3 z-10">
						<h2 className="text-sm font-medium uppercase tracking-wide opacity-70">Runs</h2>
					</div>
					<div className="px-3 pb-6 min-h-[100px]">
						{isLoading && (
							<div className="flex w-full items-centre justify-centre py-8">
								<Loader2 className="h-5 w-5 animate-spin" />
							</div>
						)}
						{error && <ErrorBox message={error.message} />}
						{!isLoading && !error && runs && runs.length === 0 && (
							<p className="w-full px-3 py-4 text-sm opacity-60 text-centre">No runs available</p>
						)}
						{!isLoading && !error && runs && runs.length > 0 && (
							<div className="flex flex-col gap-1">
								{runs.map((run) => (
									<Button
										key={run.runId}
										variant={selectedId === run.runId ? 'default' : 'ghost'}
										className="w-full justify-start text-left overflow-hidden px-3"
										onClick={() => onSelectFixture(run.runId)}
									>
										<span className="truncate">{run.runId}</span>
									</Button>
								))}
							</div>
						)}
					</div>
				</section>
			</div>
		</ScrollArea>
	</aside>
);
