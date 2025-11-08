'use client';

import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import type {ReactNode} from 'react';
import {useState} from 'react';

const QUERY_STALE_TIME_MS = 1000 * 60 * 5; // 5 minutes

interface PreviewLayoutProps {
	children: ReactNode;
}

const PreviewLayout = ({children}: PreviewLayoutProps): ReactNode => {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: QUERY_STALE_TIME_MS,
						refetchOnWindowFocus: false,
					},
				},
			})
	);

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

export default PreviewLayout;
