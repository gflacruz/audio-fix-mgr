import React, { createContext, useState, useEffect, useContext } from 'react';
import Modal from '@/components/Modal';

const ErrorContext = createContext();

export const useError = () => useContext(ErrorContext);

export const ErrorProvider = ({ children }) => {
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const showError = (message) => {
    setError(message);
    setIsOpen(true);
  };

  const closeError = () => {
    setIsOpen(false);
    setTimeout(() => setError(null), 300); // Clear after animation
  };

  // Listen for global API errors
  useEffect(() => {
    const handleApiError = (event) => {
      showError(event.detail);
    };

    window.addEventListener('api-error', handleApiError);
    return () => window.removeEventListener('api-error', handleApiError);
  }, []);

  return (
    <ErrorContext.Provider value={{ showError, closeError }}>
      {children}
      <Modal
        isOpen={isOpen}
        onClose={closeError}
        title="System Error"
        maxWidth="max-w-md"
        footer={
          <button
            onClick={closeError}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
          >
            Dismiss
          </button>
        }
      >
        <div className="flex flex-col gap-2">
          <p className="text-zinc-300">
            An unexpected error occurred while communicating with the server:
          </p>
          <div className="p-3 bg-red-900/20 border border-red-900/50 rounded text-red-300 font-mono text-sm whitespace-pre-wrap break-words">
            {error || 'Unknown error'}
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            If this persists, please check if the database server is running.
          </p>
        </div>
      </Modal>
    </ErrorContext.Provider>
  );
};
