import React, { useState, useMemo } from 'react';
import NodeGraph from './visualization/NodeGraph';
import WalletList from './WalletList';
import MonthSelector from './MonthSelector';
import { filterTransactionsByMonths } from '../utils/dateUtils';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

function TokenVisualization({ data, onBack }) {
  const [hiddenWallets, setHiddenWallets] = useState(new Set());
  const [selectedMonths, setSelectedMonths] = useState(6);

  const toggleWallet = (walletId) => {
    const newHiddenWallets = new Set(hiddenWallets);
    if (hiddenWallets.has(walletId)) {
      newHiddenWallets.delete(walletId);
    } else {
      newHiddenWallets.add(walletId);
    }
    setHiddenWallets(newHiddenWallets);
  };

  const filteredData = useMemo(() => {
    // First filter by time period
    const timeFilteredLinks = filterTransactionsByMonths(data.links, selectedMonths);
    
    // Get active wallet IDs from filtered transactions
    const activeWallets = new Set();
    timeFilteredLinks.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      activeWallets.add(sourceId);
      activeWallets.add(targetId);
    });

    // Filter nodes and links based on visibility settings
    const filteredNodes = data.nodes.filter(node => 
      activeWallets.has(node.id) &&
      !hiddenWallets.has(node.id)
    );

    const filteredLinks = timeFilteredLinks.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return (
        !hiddenWallets.has(sourceId) && 
        !hiddenWallets.has(targetId)
      );
    });

    return {
      nodes: filteredNodes,
      links: filteredLinks
    };
  }, [data, hiddenWallets, selectedMonths]);

  return (
    <div className="fixed inset-0 flex bg-gray-900">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-20 bg-gray-800 text-white p-2 rounded-full hover:bg-gray-700 transition-colors"
        title="Back to Token Analysis"
      >
        <ArrowLeftIcon className="h-6 w-6" />
      </button>
      <WalletList nodes={data.nodes} onToggleWallet={toggleWallet} />
      <div className="flex-1 relative">
        <MonthSelector selectedMonths={selectedMonths} onChange={setSelectedMonths} />
        <NodeGraph data={filteredData} />
      </div>
    </div>
  );
}

export default TokenVisualization;