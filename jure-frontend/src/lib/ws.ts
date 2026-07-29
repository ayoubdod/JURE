type WSHandler = (event: any) => void;

class WSClient {
  private ws?: WebSocket;
  private handlers: Record<string, WSHandler[]> = {};
  constructor(private url: string) {}

  connect(token?: string) {
    const q = token ? (this.url.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}` : '';
    this.ws = new WebSocket(this.url + q);
    this.ws.onopen = () => this.emit('__open__', {});
    this.ws.onclose = () => this.emit('__close__', {});
    this.ws.onerror = (e) => this.emit('__error__', e);
    this.ws.onmessage = (ev) => {
      try { this.emit(JSON.parse(ev.data).type, JSON.parse(ev.data)); } catch {}
    };
  }

  on(type: string, cb: WSHandler) {
    (this.handlers[type] ||= []).push(cb);
    return () => this.handlers[type] = (this.handlers[type] || []).filter(h => h !== cb);
  }

  emit(type: string, payload: any) {
    (this.handlers[type] || []).forEach(h => h(payload));
  }

  send(obj: any) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  close() { this.ws?.close(); }
}

export default WSClient;
