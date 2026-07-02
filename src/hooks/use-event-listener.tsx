import { useEffect, useRef } from "react";
import { logger } from "@/src/lib/logger";

export default function useEventListener<K extends keyof WindowEventMap>(
  event: K,
  handler: (event: WindowEventMap[K]) => void,
) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (event: WindowEventMap[K]) => {
      handlerRef.current(event);
    };

    logger.info('EVENT', "Add event listener", { event });
    window.addEventListener(event, listener);
    return () => {
      logger.info("EVENT", "Remove event listener", { event });
      window.removeEventListener(event, listener);
    };
  }, [event]);
}
