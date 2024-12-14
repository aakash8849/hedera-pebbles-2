import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

function WalletList({ nodes, onToggleWallet }) {
  const [search, setSearch] = useState('');
  const [hiddenWallets, setHiddenWallets] = useState(new Set());

  // Sort wallets by balance percentage
  const sortedWallets = [...nodes].sort((a, b) => b.value - a.value);
  const totalBalance = nodes.reduce((sum, node) => sum + node.value, 0);

  const toggleWallet = (walletId) => {
    const newHiddenWallets = new Set(hiddenWallets);
    if (hiddenWallets.has(walletId)) {
      newHiddenWallets.delete(walletId);
    } else {
      newHiddenWallets.add(walletId);
    }
    setHiddenWallets(newHiddenWallets);
    onToggleWallet(walletId);
  };

  const filteredWallets = sortedWallets.filter(wallet => 
    wallet.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-gray-900 text-white w-80 h-full overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold mb-4">Wallets List</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search Wallets"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredWallets.map((wallet, index) => {
          const percentage = (wallet.value / totalBalance * 100).toFixed(2);
          return (
            <div
              key={wallet.id}
              className="flex items-center justify-between p-4 hover:bg-gray-800 border-b border-gray-700"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">#{index + 1}</span>
                  <span className="text-sm font-medium truncate">{wallet.id}</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {percentage}%
                </div>
              </div>
              <button
                onClick={() => toggleWallet(wallet.id)}
                className="ml-2 p-1 hover:bg-gray-700 rounded"
              >
                {hiddenWallets.has(wallet.id) ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WalletList;