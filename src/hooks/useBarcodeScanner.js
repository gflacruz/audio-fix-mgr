import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const BUFFER_TIMEOUT_MS = 500;
const MIN_BARCODE_LENGTH = 3;
const BLOCKED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function useBarcodeScanner() {
  const navigate = useNavigate();
  const bufferRef = useRef('');
  const timerRef = useRef(null);

  useEffect(() => {
    const resetBuffer = () => {
      bufferRef.current = '';
      timerRef.current = null;
    };

    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toUpperCase();
      if (BLOCKED_TAGS.has(tag)) return;

      if (timerRef.current) clearTimeout(timerRef.current);

      if (e.key === 'Enter') {
        const scanned = bufferRef.current;
        resetBuffer();
        if (/^\d+$/.test(scanned) && scanned.length >= MIN_BARCODE_LENGTH) {
          navigate(`/repair/${scanned}`);
        }
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
        timerRef.current = setTimeout(resetBuffer, BUFFER_TIMEOUT_MS);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [navigate]);
}
