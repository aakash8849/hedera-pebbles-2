import React from 'react';

export function Button({ children, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center transition-colors duration-200 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}