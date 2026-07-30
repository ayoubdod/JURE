import { getChatWsUrl } from '@/config/api';

export type ChatInbound =
  | { type: "conversation.joined"; conversation: number }
  | { type: "typing"; user: number; status: "start" | "stop" }
  | { type: "message"; event: "created" | "edited" | "deleted"; message_id: number }
  | { type: "read"; user: number; up_to_id: number }
  | Record<string, unknown>;

export class ChatSocket {
  ws?: WebSocket;
  private listeners = new Map<string, ((ev: any) => void)[]>();
  private heartbeatId?: number;

  constructor(private token: string) {}

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.ws = new WebSocket(getChatWsUrl(this.token));
    this.ws.onopen = () => {
      this.heartbeatId = window.setInterval(() => this.send({ type: "presence.heartbeat" }), 15000);
    };
    this.ws.onmessage = (e) => {
      const msg: ChatInbound = JSON.parse(e.data);
      const cbs = this.listeners.get((msg as any).type) || [];
      cbs.forEach((fn) => fn(msg));
    };
    this.ws.onclose = () => {
      if (this.heartbeatId) window.clearInterval(this.heartbeatId);
      this.heartbeatId = undefined;
      // naive retry
      setTimeout(() => this.connect(), 2000);
    };
  }

  on<T = any>(type: string, cb: (ev: T) => void) {
    const arr = this.listeners.get(type) || [];
    arr.push(cb as any);
    this.listeners.set(type, arr);
  }
  off(type: string, cb: (ev: any) => void) {
    const arr = this.listeners.get(type) || [];
    this.listeners.set(
      type,
      arr.filter((x) => x !== cb)
    );
  }

  send(payload: any) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload));
  }

  joinConversation(id: number) {
    this.send({ type: "conversation.join", conversation: id });
  }
  typingStart() {
    this.send({ type: "typing.start" });
  }
  typingStop() {
    this.send({ type: "typing.stop" });
  }
  createMessage(conversation: number, body: string, reply_to?: number) {
    this.send({ type: "message.create", conversation, body, reply_to });
  }
  markRead(conversation: number, up_to_id: number) {
    this.send({ type: "message.read", conversation, up_to_id });
  }
}
