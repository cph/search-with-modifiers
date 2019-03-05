import EventableEvent from './eventable-event';

type EventHandler = (...args: any[]) => any;

interface EventMap {
  [key: string]: EventHandler[];
}

export default class Eventable {
  private eventMap: EventMap = {};

  public on(eventName: string, handler: EventHandler): void {
    if (this.eventMap[eventName] === undefined) { this.eventMap[eventName] = []; }
    if (this.eventMap[eventName].indexOf(handler) === -1) { this.eventMap[eventName].push(handler); }
  }

  public off(eventName: string, handler?: EventHandler): void {
    if (this.eventMap[eventName] === undefined) { return; }
    if (handler) {
      const handlerIndex = this.eventMap[eventName].indexOf(handler);
      if (handlerIndex > -1) { this.eventMap[eventName].splice(handlerIndex, 1); }
    } else {
      delete this.eventMap[eventName];
    }
  }

  public trigger(eventName: string, ...args: any[]): void {
    const event = new EventableEvent(this, eventName);
    const handlers = this.eventMap[eventName];
    if (handlers) {
      handlers.forEach((handler) => {
        if (event.stopped) { return; }
        handler(event, ...args);
      });
    }
  }
}
