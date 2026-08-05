/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import useUserStore from './userStore';
import { devError, devLog } from '@/utils/devLog';

export interface WebSocketMessage {
  type: string;
  payload: any;
}

const callMessageSubscribers = new Set<(msg: WebSocketMessage) => void>();

/** Subscribe to `call.*` messages on the main chat WebSocket (signaling). */
export function subscribeCallMessages(handler: (msg: WebSocketMessage) => void): () => void {
  callMessageSubscribers.add(handler);
  return () => {
    callMessageSubscribers.delete(handler);
  };
}

export interface ChatStore {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  user: { id: number; email: string } | null;
  notifications: any[];
  /** Last conversation.updated payload for subscribers to merge into their lists */
  lastConversationUpdated: API.Conversation | null;
  /** IDs of users/members currently connected to chat (from online_user_ids, online_member_ids, or online). In this app they are the same. */
  onlineIds: number[];

  // WebSocket instance
  ws: WebSocket | null;

  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => void;
  clearConversationUpdate: () => void;
}

const useChatStore = create<ChatStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    user: null,
    ws: null,
    notifications: [],
    lastConversationUpdated: null,
    onlineIds: [],
    // Connection methods
    connect: async () => {
      const state = get();

      // Already connected / connecting — avoid tearing down on layout re-renders
      if (state.isConnecting) return;
      if (state.ws && (state.isConnected || state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) {
        return;
      }

      // Close existing connection if any
      if (state.ws) {
        state.disconnect();
      }

      set({ 
        isConnecting: true, 
        connectionError: null 
      });

      try {
        const userStore = useUserStore.getState();
        const accessToken = userStore.accessToken;
        
        if (!accessToken) {
          throw new Error('No access token available');
        }

        const { getChatWsUrl } = await import('@/config/api');
        const ws = new WebSocket(getChatWsUrl(accessToken));

        ws.onopen = () => {
          set({ 
            isConnected: true, 
            isConnecting: false, 
            connectionError: null,
            ws 
          });
        };

        ws.onmessage = (event) => {
          try {
            const data: WebSocketMessage = JSON.parse(event.data);

            if (typeof data.type === 'string' && data.type.startsWith('call.')) {
              callMessageSubscribers.forEach((fn) => {
                try {
                  fn(data);
                } catch (e) {
                  devError('call message subscriber error:', e);
                }
              });
            }

            // Handle different message types from ChatConsumer
            switch (data.type) {
              case 'connection.established': {
                const payload = data.payload ?? {};
                const msg = data as any;
                const notifications = Array.isArray(payload) ? payload : (payload?.notifications ?? payload ?? []);
                let onlineIds =
                  payload?.online_user_ids ??
                  payload?.online_member_ids ??
                  payload?.online ??
                  payload?.users ??
                  msg?.online_user_ids ??
                  msg?.online_member_ids ??
                  msg?.online ??
                  [];
                onlineIds = Array.isArray(onlineIds) ? onlineIds : [];
                const connectingUserId = msg?.user_id ?? payload?.user_id;
                if (typeof connectingUserId === 'number' && !onlineIds.includes(connectingUserId)) {
                  onlineIds = [...onlineIds, connectingUserId];
                }
                set({ notifications, onlineIds });
                break;
              }
              case 'presence.list':
              case 'presence.update': {
                const p = data.payload ?? {};
                const msg = data as any;
                let onlineIds =
                  p?.online_user_ids ??
                  p?.online_member_ids ??
                  (Array.isArray(p) ? p : p?.online) ??
                  p?.users ??
                  msg?.online_user_ids ??
                  msg?.online_member_ids ??
                  msg?.online ??
                  [];
                onlineIds = Array.isArray(onlineIds) ? onlineIds : [];
                set({ onlineIds });
                break;
              }
              case 'notification.new':
                set({ notifications: [ data.payload,...get().notifications] });
                break;
              case 'error':
                devError('WebSocket error:', data.payload);
                set({ connectionError: data.payload.message });
                break;
              case 'conversation.updated':
                if (data.payload && typeof data.payload?.id === 'number') {
                  set({ lastConversationUpdated: data.payload });
                }
                break;

              default:
                if (!data.type?.startsWith('call.')) {
                  devLog('Unknown message type:', data.type);
                }
            }
          } catch (error) {
            devError('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          set({ 
            isConnected: false, 
            isConnecting: false, 
            ws: null,
            user: null,
            connectionError: event.code !== 1000 ? `Connection closed: ${event.reason || 'Unknown error'}` : null
          });
        };

        ws.onerror = (error) => {
          devError('WebSocket error:', error);
          set({ 
            isConnected: false, 
            isConnecting: false, 
            connectionError: 'Connection failed' 
          });
        };

      } catch (error) {
        devError('Failed to connect to WebSocket:', error);
        set({ 
          isConnecting: false, 
          connectionError: error instanceof Error ? error.message : 'Connection failed' 
        });
      }
    },

    disconnect: () => {
      const state = get();
      if (state.ws) {
        state.ws.close();
        set({ 
          ws: null, 
          isConnected: false, 
          isConnecting: false,
          user: null
        });
      }
    },

    clearConversationUpdate: () => set({ lastConversationUpdated: null }),
  }))
);

// Subscribe to user store changes to handle logout
useUserStore.subscribe((state) => {
  if (!state.isLoggedIn) {
    // Disconnect WebSocket when user logs out
    useChatStore.getState().disconnect();
  }
});


export default useChatStore;