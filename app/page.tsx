'use client';

import {useState} from 'react';

import type {Analysis} from '@sigil/src/common/types/analysisSchema';
import type {QueryState} from '@sigil/src/common/types/queryState';
import type {DetectionResult} from '@sigil/src/data/formatDetector';
import {DataCanvas} from '@sigil/src/ui/components/DataCanvas';
import {DataInput} from '@sigil/src/ui/components/DataInput';

const Home = () => {
	const [result, setResult] = useState<DetectionResult | null>(null);
	const [analysisState, setAnalysisState] = useState<QueryState<Analysis, string>>({status: 'idle'});
	const [sessionId, setSessionId] = useState<string | null>(null);

	const handleAnalyse = (detectionResult: DetectionResult, newAnalysisState: QueryState<Analysis, string>, newSessionId: string | null) => {
		setResult(detectionResult);
		setAnalysisState(newAnalysisState);
		setSessionId(newSessionId);
	};

	return (
		<div className="flex h-screen">
			<DataInput onAnalyse={handleAnalyse} />
			<DataCanvas result={result} analysisState={analysisState} sessionId={sessionId} />
		</div>
	);
};

export default Home;
