'use client';

import {useRouter, useSearchParams} from 'next/navigation';
import type {ReactNode} from 'react';
import {use, useEffect, useState} from 'react';

import type {LogsSidebarState} from '../components/preview';
import {FixtureSidebar, LogsSidebar, PreviewCanvas} from '../components/preview';
import {useRun} from '../hooks/useRun';
import {useRunList} from '../hooks/useRunList';

interface PreviewPageProps {
	params: Promise<{
		runId?: string;
	}>;
}

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
	const runQuery = useRun(runId ?? null);

	const runs = runListQuery.data;

	useEffect(() => {
		if (runId && !hasSelectedBefore) {
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
		if (!runId) {
			return;
		}

		const newState = sidebarState === 'expanded' ? 'closed' : 'expanded';
		router.replace(`/preview/${runId}?previewLogsSidepanelState=${newState}`);
	};

	return (
		<div className="grid h-screen" style={{gridTemplateColumns: '320px 1fr auto'}}>
			<FixtureSidebar
				runs={runs}
				selectedId={runId ?? null}
				onSelectFixture={handleSelectFixture}
				isLoading={runListQuery.isLoading}
				error={runListQuery.error}
			/>

			<PreviewCanvas
				run={runQuery.data}
				isLoading={runQuery.isLoading}
				error={runQuery.error}
			/>

			<LogsSidebar
				run={runQuery.data}
				state={sidebarState}
				onToggle={handleToggleSidebar}
				isLoading={runQuery.isLoading}
			/>
		</div>
	);
};

export default PreviewPage;
