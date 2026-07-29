import { create } from 'zustand';
import useUserStore from './userStore';
import { getCallsWsUrl } from '@/config/api';
import { devError, devWarn } from '@/utils/devLog';

export type CallsWsMessage = Record<string, unknown> & { type?: string };

const subscribers = new Set<(msg: CallsWsMessage) => void>();

/** Subscribe to all JSON messages on the dedicated `/ws/calls/` WebSocket. */
export function subscribeCallsMessages(handler: (msg: CallsWsMessage) => void): () => void {
  subscribers.add(handler);
  return () => {
    subscribers.delete(handler);
  };
}

function notify(msg: CallsWsMessage) {
  subscribers.forEach((fn) => {
    try {
      fn(msg);
    } catch (e) {
      devError('[calls ws] subscriber error', e);
    }
  });
}

let connectPromise: Promise<void> | null = null;

export interface CallsWsStore {
  ws: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (obj: Record<string, unknown>) => boolean;
}

const useCallsWsStore = create<CallsWsStore>((set, get) => ({
  ws: null,
  isConnected: false,
  isConnecting: false,

  connect: async () => {
    if (get().ws?.readyState === WebSocket.OPEN) return;
    if (connectPromise) return connectPromise;

    const token = useUserStore.getState().accessToken;
    if (!token) {
      throw new Error('No access token');
    }

    connectPromise = new Promise<void>((resolve, reject) => {
      set({ isConnecting: true });
      const ws = new WebSocket(getCallsWsUrl(token));
      let settled = false;

      const failConnect = (reason: string) => {
        if (settled) return;
        settled = true;
        set({ isConnecting: false });
        reject(new Error(reason));
      };

      ws.onopen = () => {
        settled = true;
        set({ ws, isConnected: true, isConnecting: false });
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as CallsWsMessage;
          notify(data);
        } catch (e) {
          devError('[calls ws] invalid JSON', e);
        }
      };

      ws.onclose = (ev) => {
        if (ev.code === 4001) {
          devWarn(
            '[calls ws] closed with 4001 (auth failed). Use ?token=<JWT> on the URL or a valid auth cookie.'
          );
        }
        set({ ws: null, isConnected: false, isConnecting: false });
        if (!settled) {
          failConnect(
            ev.code === 4001
              ? 'Calls WebSocket auth failed (close code 4001)'
              : 'Calls WebSocket closed before open'
          );
        }
      };

      ws.onerror = () => {
        set({ isConnecting: false });
        if (ws.readyState !== WebSocket.OPEN && !settled) {
          failConnect('Calls WebSocket connection failed');
        }
      };
    });

    try {
      await connectPromise;
    } finally {
      connectPromise = null;
    }
  },

  disconnect: () => {
    const { ws } = get();
    connectPromise = null;
    if (ws) {
      ws.close();
    }
    set({ ws: null, isConnected: false, isConnecting: false });
  },

  send: (obj) => {
    const { ws } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    ws.send(JSON.stringify(obj));
    return true;
  },
}));

useUserStore.subscribe((state) => {
  if (!state.isLoggedIn) {
    useCallsWsStore.getState().disconnect();
  }
});

export default useCallsWsStore;
