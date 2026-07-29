import type { WebSocketMessage } from '@/stores/chatStore';
import { devError } from '@/utils/devLog';

const subscribers = new Set<(msg: WebSocketMessage | Record<string, unknown>) => void>();

let activeSignaling: { conversationId: number; ws: WebSocket } | null = null;

/** Subscribe to `call.*` frames from `/ws/conversation/<id>/` (same handler shape as chat/calls). */
export function subscribeConversationCallMessages(
  handler: (msg: WebSocketMessage | Record<string, unknown>) => void
): () => void {
  subscribers.add(handler);
  return () => {
    subscribers.delete(handler);
  };
}

export function emitConversationCallMessage(msg: WebSocketMessage | Record<string, unknown>): void {
  subscribers.forEach((fn) => {
    try {
      fn(msg);
    } catch (e) {
      devError('[conversation ws call] subscriber error', e);
    }
  });
}

/** Active thread socket used to send `call.accept` / offer / ICE when user has no `/ws/calls/` connection. */
export function registerConversationSignalingSocket(conversationId: number, ws: WebSocket): void {
  activeSignaling = { conversationId, ws };
}

export function unregisterConversationSignalingSocket(conversationId: number): void {
  if (activeSignaling?.conversationId === conversationId) {
    activeSignaling = null;
  }
}

export function sendConversationCallSignal(
  conversationId: number,
  obj: Record<string, unknown>
): boolean {
  const slot = activeSignaling;
  if (!slot || slot.conversationId !== conversationId || slot.ws.readyState !== WebSocket.OPEN) {
    return false;
  }
  try {
    slot.ws.send(JSON.stringify(obj));
    return true;
  } catch {
    return false;
  }
}
