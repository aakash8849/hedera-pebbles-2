import React, { useState } from 'react';
import TokenInput from './TokenInput';
import ModeToggle from './ModeToggle';
import AnalyzerDescription from './AnalyzerDescription';
import TokenVisualization from './TokenVisualization';
import { analyzeToken, visualizeToken } from '../services/tokenService';

function TokenAnalyzer() {
  const [tokenId, setTokenId] = useState('');
  const [isVisualizeMode, setIsVisualizeMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [visualizationData, setVisualizationData] = useState(null);

  const handleSubmit = async () => {
    if (!tokenId.match(/^\d+\.\d+\.\d+$/)) {
      setError('Invalid token ID format');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      if (isVisualizeMode) {
        const data = await visualizeToken(tokenId);
        setVisualizationData(data);
      } else {
        await analyzeToken(tokenId);
      }
    } catch (err) {
      setError(err.message);
      setVisualizationData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setVisualizationData(null);
  };

  if (visualizationData && isVisualizeMode) {
    return <TokenVisualization data={visualizationData} onBack={handleBack} />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <TokenInput 
            value={tokenId} 
            onChange={setTokenId} 
            error={error}
          />
          <ModeToggle 
            isVisualizeMode={isVisualizeMode} 
            onChange={setIsVisualizeMode} 
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
        >
          {isLoading ? 'Processing...' : isVisualizeMode ? 'Visualize Data' : 'Fetch Data'}
        </button>

        <AnalyzerDescription isVisualizeMode={isVisualizeMode} />
      </div>
    </div>
  );
}

export default TokenAnalyzer;