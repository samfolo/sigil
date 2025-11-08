import {Loader2} from 'lucide-react';
import type {ReactNode} from 'react';

import type {FixtureMetadata} from '@sigil/src/common/fixtures/schemas';
import {Button} from '@sigil/src/ui/primitives/button';
import {ScrollArea} from '@sigil/src/ui/primitives/scroll-area';

import {ErrorBox} from './ErrorBox';

interface FixtureSidebarProps {
	fixtures: FixtureMetadata[] | undefined;
	logsFixtures: FixtureMetadata[] | undefined;
	selectedId: string | null;
	onSelectFixture: (id: string) => void;
	isLoading: boolean;
	error: Error | null;
}

/**
 * Left sidebar displaying fixture and log file lists
 *
 * Two sections with sticky headers that collapse properly when scrolling.
 * Fixtures section shows fixtures/ directory, Logs section shows logs/ directory.
 */
export const FixtureSidebar = ({
	fixtures,
	logsFixtures,
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
				{/* Fixtures Section */}
				<section>
					<div className="sticky top-0 bg-preview-sidebar px-6 py-3 z-10">
						<h2 className="text-sm font-medium uppercase tracking-wide opacity-70">Fixtures</h2>
					</div>
					<div className="px-3 pb-6 min-h-[100px]">
						{isLoading && (
							<div className="flex w-full items-centre justify-centre py-8">
								<Loader2 className="h-5 w-5 animate-spin" />
							</div>
						)}
						{error && <ErrorBox message={error.message} />}
						{!isLoading && !error && fixtures && fixtures.length === 0 && (
							<p className="w-full px-3 py-4 text-sm opacity-60 text-centre">No fixtures available</p>
						)}
						{!isLoading && !error && fixtures && fixtures.length > 0 && (
							<div className="flex flex-col gap-1">
								{fixtures.map((fixture) => (
									<Button
										key={fixture.id}
										variant={selectedId === fixture.id ? 'default' : 'ghost'}
										className="w-full justify-start text-left overflow-hidden px-3"
										onClick={() => onSelectFixture(fixture.id)}
									>
										<span className="truncate">{fixture.displayName}</span>
									</Button>
								))}
							</div>
						)}
					</div>
				</section>

				{/* Logs Section */}
				<section>
					<div className="sticky top-0 bg-preview-sidebar px-6 py-3 z-10">
						<h2 className="text-sm font-medium uppercase tracking-wide opacity-70">Logs</h2>
					</div>
					<div className="px-3 pb-6 min-h-[100px]">
						{isLoading && (
							<div className="flex w-full items-centre justify-centre py-8">
								<Loader2 className="h-5 w-5 animate-spin" />
							</div>
						)}
						{error && <ErrorBox message={error.message} />}
						{!isLoading && !error && logsFixtures && logsFixtures.length === 0 && (
							<p className="w-full px-3 py-4 text-sm opacity-60 text-centre">No logs available</p>
						)}
						{!isLoading && !error && logsFixtures && logsFixtures.length > 0 && (
							<div className="flex flex-col gap-1">
								{logsFixtures.map((fixture) => (
									<Button
										key={fixture.id}
										variant={selectedId === fixture.id ? 'default' : 'ghost'}
										className="w-full justify-start text-left overflow-hidden px-3"
										onClick={() => onSelectFixture(fixture.id)}
									>
										<span className="truncate">{fixture.displayName}</span>
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
