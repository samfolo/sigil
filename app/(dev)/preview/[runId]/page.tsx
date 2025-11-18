'use client';

import {use, useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';

import type {ReactNode} from 'react';

import type {LogsSidebarState} from '../components/preview';
import {FixtureSidebar, LogsSidebar, PreviewCanvas} from '../components/preview';
import {unwrapQueryResult, useRun, useRunList} from '../hooks';

interface PreviewPageProps {
	params: Promise<{
		runId: string;
	}>;
}

/**
 * Extracts logs sidebar state from URL search parameters
 *
 * @param searchParams - URL search parameters from Next.js router
 * @returns Validated sidebar state, defaulting to 'closed' if invalid or missing
 */
const getSidebarState = (searchParams: URLSearchParams): LogsSidebarState => {
	const param = searchParams.get('previewLogsSidepanelState');
	if (param === 'expanded' || param === 'closed' || param === 'hidden') {
		return param;
	}
	return 'closed';
};

/**
 * Preview development tool page
 *
 * Three-panel interface for browsing runs, viewing rendered output, and inspecting logs.
 * URL format: /preview/[runId]?previewLogsSidepanelState=expanded|closed|hidden
 */
const PreviewPage = ({params}: PreviewPageProps): ReactNode => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const {runId} = use(params);

	const sidebarState = getSidebarState(searchParams);
	const [hasSelectedBefore, setHasSelectedBefore] = useState(false);

	const runListQuery = useRunList();
	const runQuery = useRun(runId);

	const {data: runs, error: runListError} = unwrapQueryResult(runListQuery);
	const {data: run, error: runError} = unwrapQueryResult(runQuery);

	useEffect(() => {
		if (!hasSelectedBefore) {
			setHasSelectedBefore(true);
			router.replace(`/preview/${runId}?previewLogsSidepanelState=expanded`);
		}
	}, [runId, hasSelectedBefore, router]);

	const handleSelectFixture = (id: string) => {
		const state = hasSelectedBefore ? sidebarState : 'expanded';
		router.replace(`/preview/${id}?previewLogsSidepanelState=${state}`);
		if (!hasSelectedBefore) {
			setHasSelectedBefore(true);
		}
	};

	const handleToggleSidebar = () => {
		const newState = sidebarState === 'expanded' ? 'closed' : 'expanded';
		router.replace(`/preview/${runId}?previewLogsSidepanelState=${newState}`);
	};

	return (
		<div className="grid h-screen" style={{gridTemplateColumns: '320px 1fr auto'}}>
			<FixtureSidebar
				runs={runs}
				selectedId={runId}
				onSelectFixture={handleSelectFixture}
				isLoading={runListQuery.isLoading}
				error={runListError}
			/>

			<PreviewCanvas
				run={run}
				isLoading={runQuery.isLoading}
				error={runError}
			/>

			<LogsSidebar
				run={run}
				state={sidebarState}
				onToggle={handleToggleSidebar}
				isLoading={runQuery.isLoading}
			/>
		</div>
	);
};

export default PreviewPage;
