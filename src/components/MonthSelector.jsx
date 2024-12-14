import React from 'react';

function MonthSelector({ selectedMonths, onChange }) {
  const months = [1, 2, 3, 4, 5, 6];

  return (
    <div className="absolute top-4 right-4 z-10 bg-gray-800 p-4 rounded-lg shadow-lg">
      <h3 className="text-white text-sm font-semibold mb-2">Filter by Months</h3>
      <select
        value={selectedMonths}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-gray-700 text-white rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {months.map((month) => (
          <option key={month} value={month}>
            Last {month} {month === 1 ? 'Month' : 'Months'}
          </option>
        ))}
      </select>
    </div>
  );
}

export default MonthSelector;