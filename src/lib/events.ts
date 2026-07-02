import { AgendaCommand } from "../features/agenda/agenda.commands";

type EventArgsMap = {
  "image-uploaded": [url: string];

  "agenda:command": [command: AgendaCommand];
};

type EventName = keyof EventArgsMap;
type EventHandler<TName extends EventName> = (
  ...args: EventArgsMap[TName]
) => void;
type AnyEventHandler = (...args: unknown[]) => void;

class BrowserEventEmitter {
  private target = new EventTarget();
  private listeners = new WeakMap<AnyEventHandler, EventListener>();

  on<TName extends EventName>(eventName: TName, handler: EventHandler<TName>) {
    const listener: EventListener = (event) => {
      handler(...(event as CustomEvent<EventArgsMap[TName]>).detail);
    };

    this.listeners.set(handler as AnyEventHandler, listener);
    this.target.addEventListener(eventName, listener);
  }

  off<TName extends EventName>(eventName: TName, handler: EventHandler<TName>) {
    const listener = this.listeners.get(handler as AnyEventHandler);

    if (!listener) {
      return;
    }

    this.target.removeEventListener(eventName, listener);
    this.listeners.delete(handler as AnyEventHandler);
  }

  emit<TName extends EventName>(
    eventName: TName,
    ...args: EventArgsMap[TName]
  ) {
    this.target.dispatchEvent(
      new CustomEvent(eventName, {
        detail: args,
      }),
    );
  }
}

export const eventEmitter = new BrowserEventEmitter();
