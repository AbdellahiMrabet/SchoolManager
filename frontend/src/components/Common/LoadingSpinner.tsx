// src/components/Common/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'جاري التحميل...' }) => {
  return (
    <div className="loading-container">
      <i className="fas fa-spinner fa-spin"></i>
      <p>{message}</p>
    </div>
  );
};