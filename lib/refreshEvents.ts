type RefreshCallback = () => void;

const listeners: Set<RefreshCallback> = new Set();

export function emitDataCleared() {
  listeners.forEach((callback) => callback());
}

export function subscribeToDataCleared(callback: RefreshCallback): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
