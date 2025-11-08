'use client';

import {useRouter, useSearchParams} from 'next/navigation';
import type {ReactNode} from 'react';
import {use, useEffect, useState} from 'react';

import type {LogsSidebarState} from '../components/preview';
import {FixtureSidebar, LogsSidebar, PreviewCanvas} from '../components/preview';
import {useFixture} from '../hooks/useFixture';
import {useFixtureList} from '../hooks/useFixtureList';

interface PreviewPageProps {
	params: Promise<{
		id?: string[];
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
 * Three-panel interface for browsing fixtures, viewing rendered output, and inspecting logs.
 * URL format: /preview/[fixture-id]?previewLogsSidepanelState=expanded|closed|hidden
 */
const PreviewPage = ({params}: PreviewPageProps): ReactNode => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const {id} = use(params);

	const fixtureId = id ? id.join('/') : null;
	const sidebarState = getSidebarState(searchParams);
	const [hasSelectedBefore, setHasSelectedBefore] = useState(false);

	const fixtureListQuery = useFixtureList();
	const fixtureQuery = useFixture(fixtureId);

	const fixtures = fixtureListQuery.data?.filter((f) => f.id.startsWith('fixtures/'));
	const logsFixtures = fixtureListQuery.data?.filter((f) => f.id.startsWith('logs/'));

	useEffect(() => {
		if (fixtureId && !hasSelectedBefore) {
			setHasSelectedBefore(true);
			router.replace(`/preview/${fixtureId}?previewLogsSidepanelState=expanded`);
		}
	}, [fixtureId, hasSelectedBefore, router]);

	const handleSelectFixture = (id: string) => {
		const state = hasSelectedBefore ? sidebarState : 'expanded';
		router.replace(`/preview/${id}?previewLogsSidepanelState=${state}`);
		if (!hasSelectedBefore) {
			setHasSelectedBefore(true);
		}
	};

	const handleToggleSidebar = () => {
		if (!fixtureId) {
			return;
		}

		const newState = sidebarState === 'expanded' ? 'closed' : 'expanded';
		router.replace(`/preview/${fixtureId}?previewLogsSidepanelState=${newState}`);
	};

	return (
		<div className="grid h-screen" style={{gridTemplateColumns: '320px 1fr auto'}}>
			<FixtureSidebar
				fixtures={fixtures}
				logsFixtures={logsFixtures}
				selectedId={fixtureId}
				onSelectFixture={handleSelectFixture}
				isLoading={fixtureListQuery.isLoading}
				error={fixtureListQuery.error}
			/>

			<PreviewCanvas
				fixture={fixtureQuery.data}
				isLoading={fixtureQuery.isLoading}
				error={fixtureQuery.error}
			/>

			<LogsSidebar
				fixture={fixtureQuery.data}
				state={sidebarState}
				onToggle={handleToggleSidebar}
				isLoading={fixtureQuery.isLoading}
			/>
		</div>
	);
};

export default PreviewPage;
