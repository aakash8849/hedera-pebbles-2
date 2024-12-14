import React, { useState } from 'react';
import TokenAnalyzer from './components/TokenAnalyzer';
import Header from './components/Header';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <TokenAnalyzer />
      </main>
    </div>
  );
}

export default App;