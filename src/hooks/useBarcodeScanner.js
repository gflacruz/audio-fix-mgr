import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const BUFFER_TIMEOUT_MS = 500;
const MIN_BARCODE_LENGTH = 3;
const SCANNER_THRESHOLD_MS = 100;

export function useBarcodeScanner() {
  const navigate = useNavigate();
  const bufferRef = useRef('');
  const timerRef = useRef(null);
  const bufferStartTimeRef = useRef(0);

  useEffect(() => {
    const resetBuffer = () => {
      bufferRef.current = '';
      timerRef.current = null;
      bufferStartTimeRef.current = 0;
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        const scanned = bufferRef.current;
        const elapsed = Date.now() - bufferStartTimeRef.current;
        resetBuffer();
        if (
          /^\d+$/.test(scanned) &&
          scanned.length >= MIN_BARCODE_LENGTH &&
          elapsed < SCANNER_THRESHOLD_MS
        ) {
          e.preventDefault();
          navigate(`/repair/${scanned}`);
        }
        return;
      }

      if (e.key.length !== 1) return;

      if (!/\d/.test(e.key)) {
        // Non-digit printable char — not a numeric barcode scan, reset
        resetBuffer();
        return;
      }

      // Digit key: accumulate
      if (bufferRef.current.length === 0) {
        bufferStartTimeRef.current = Date.now();
      }
      bufferRef.current += e.key;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(resetBuffer, BUFFER_TIMEOUT_MS);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [navigate]);
}
