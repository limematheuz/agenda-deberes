import { useCallback, useEffect, useState } from "react";
import {
  flushSyncQueue,
  getSyncState,
  subscribeSyncState,
  type SyncState,
} from "../../infrastructure/offline/syncManager";

export function useSyncStatus() {
  const [state, setState] = useState<SyncState>(getSyncState);

  useEffect(() => {
    return subscribeSyncState(setState);
  }, []);

  const syncNow = useCallback(() => {
    void flushSyncQueue();
  }, []);

  return {
    ...state,
    syncNow,
  };
}
