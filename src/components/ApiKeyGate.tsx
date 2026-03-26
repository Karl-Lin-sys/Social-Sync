import React, { useState, useEffect } from 'react';
import { Key } from 'lucide-react';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export function ApiKeyGate({ children }: { children: React.ReactNode }) {
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        try {
          const has = await window.aistudio.hasSelectedApiKey();
          setHasKey(has);
        } catch (e) {
          console.error("Error checking API key:", e);
        }
      } else {
        // Not in AI Studio or API not available, assume we can proceed
        setHasKey(true);
      }
      setLoading(false);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        // Assume success, the actual API call will fail if it's invalid and we can handle it there
        setHasKey(true);
      } catch (e) {
        console.error("Error opening key selector:", e);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="animate-pulse text-gray-400">Checking credentials...</div>
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key size={32} />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">API Key Required</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            This application uses advanced image generation models (Gemini 3 Pro Image) which require a paid Google Cloud API key.
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full bg-gray-900 text-white font-medium py-3 px-4 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            Select API Key
          </button>
          <div className="mt-6 text-sm text-gray-400">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="hover:text-gray-600 underline underline-offset-2">
              Billing Documentation
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
