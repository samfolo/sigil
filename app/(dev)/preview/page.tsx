'use client';

import {useRouter, useSearchParams} from 'next/navigation';
import type {ReactNode} from 'react';
import {Suspense, useState} from 'react';

import type {LogsSidebarState} from './components/preview';
import {FixtureSidebar, LogsSidebar, PreviewCanvas} from './components/preview';
import {useRunList} from './hooks/useRunList';

/**
 * Gets the sidebar state from URL search params
 */
const getSidebarState = (searchParams: URLSearchParams): LogsSidebarState => {
	const param = searchParams.get('previewLogsSidepanelState');
	if (param === 'expanded' || param === 'closed' || param === 'hidden') {
		return param;
	}
	return 'closed';
};

/**
 * Preview development tool page content (base route without runId)
 *
 * Three-panel interface for browsing runs. When a run is selected,
 * navigates to /preview/[runId]
 */
const PreviewPageContent = (): ReactNode => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [hasSelectedBefore, setHasSelectedBefore] = useState(false);

	const runListQuery = useRunList();
	const runs = runListQuery.data;

	const sidebarState = getSidebarState(searchParams);

	const handleSelectFixture = (id: string) => {
		const state = hasSelectedBefore ? sidebarState : 'expanded';
		router.replace(`/preview/${id}?previewLogsSidepanelState=${state}`);
		if (!hasSelectedBefore) {
			setHasSelectedBefore(true);
		}
	};

	return (
		<div className="grid h-screen" style={{gridTemplateColumns: '320px 1fr auto'}}>
			<FixtureSidebar
				runs={runs}
				selectedId={null}
				onSelectFixture={handleSelectFixture}
				isLoading={runListQuery.isLoading}
				error={runListQuery.error}
			/>

			<PreviewCanvas
				run={undefined}
				isLoading={false}
				error={null}
			/>

			<LogsSidebar
				run={undefined}
				state="hidden"
				onToggle={() => {}}
				isLoading={false}
			/>
		</div>
	);
};

/**
 * Preview page with Suspense boundary for useSearchParams
 */
const PreviewPageWrapper = (): ReactNode => {
	return (
		<Suspense fallback={<div className="h-screen bg-background" />}>
			<PreviewPageContent />
		</Suspense>
	);
};

export default PreviewPageWrapper;
