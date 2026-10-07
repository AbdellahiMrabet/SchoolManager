// src/components/Common/ErrorMessage.tsx
import React from 'react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <div className="error-container">
      <i className="fas fa-exclamation-triangle"></i>
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          إعادة المحاولة
        </button>
      )}
    </div>
  );
};