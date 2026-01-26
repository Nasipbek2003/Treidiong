'use client';

import { useEffect, useState } from 'react';

export function InitSignals() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    const initSystem = async () => {
      setStatus('loading');

      try {
        const response = await fetch('/api/signals/auto-start', {
          method: 'POST',
        });

        if (response.ok) {
          setStatus('success');
          console.log('✅ Signal system started');
        } else {
          setStatus('error');
          console.error('❌ Failed to start signal system');
        }
      } catch (error) {
        setStatus('error');
        console.error('❌ Error starting signal system:', error);
      }
    };

    initSystem();
  }, []);

  return null;
}
