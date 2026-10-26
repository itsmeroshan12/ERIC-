import { useCallback, useRef, useState } from 'react';

// Short-lived event messages ("Goal reached", "Emergency stop engaged", ...).
export function useToasts(ttl = 3200) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const push = useCallback((text, tone = 'info') => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-3), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }, [ttl]);

  return { toasts, push };
}
