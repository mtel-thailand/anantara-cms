type EventMap = {
  "image-uploaded": string;
};

type EventName = keyof EventMap;
type EventHandler<TName extends EventName> = (payload: EventMap[TName]) => void;

class BrowserEventEmitter {
  private target = new EventTarget();
  private listeners = new WeakMap<
    EventHandler<EventName>,
    EventListener
  >();

  on<TName extends EventName>(
    eventName: TName,
    handler: EventHandler<TName>,
  ) {
    const listener: EventListener = (event) => {
      handler((event as CustomEvent<EventMap[TName]>).detail);
    };

    this.listeners.set(handler as EventHandler<EventName>, listener);
    this.target.addEventListener(eventName, listener);
  }

  off<TName extends EventName>(
    eventName: TName,
    handler: EventHandler<TName>,
  ) {
    const listener = this.listeners.get(handler as EventHandler<EventName>);

    if (!listener) {
      return;
    }

    this.target.removeEventListener(eventName, listener);
    this.listeners.delete(handler as EventHandler<EventName>);
  }

  emit<TName extends EventName>(
    eventName: TName,
    payload: EventMap[TName],
  ) {
    this.target.dispatchEvent(
      new CustomEvent(eventName, {
        detail: payload,
      }),
    );
  }
}

export const eventEmitter = new BrowserEventEmitter();
