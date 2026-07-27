import { useCallback, useRef, useState } from "react";

export default function useAsync(initialLoad?: boolean) {
  const [isLoading, setIsLoading] = useState<boolean>(initialLoad ?? false);
  const pendingCount = useRef(0);

  const execute = useCallback(
    async <TArgs extends unknown[], TResult>(
      callback: (...args: TArgs) => Promise<TResult>,
      ...args: TArgs
    ) => {
      pendingCount.current += 1;
      setIsLoading(true);

      try {
        return await callback(...args);
      } finally {
        pendingCount.current -= 1;
        if (pendingCount.current === 0) setIsLoading(false);
      }
    },
    [],
  );

  return { isLoading, execute };
}
