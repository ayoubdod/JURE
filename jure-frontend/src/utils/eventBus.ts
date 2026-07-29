// Simple event bus for global communication
type EventCallback = () => void;

class EventBus {
  private events: { [key: string]: EventCallback[] } = {};

  on(event: string, callback: EventCallback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: EventCallback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }

  emit(event: string) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback());
    }
  }
}

export const eventBus = new EventBus();




