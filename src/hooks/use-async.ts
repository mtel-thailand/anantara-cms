import { useCallback, useState } from "react";

export default function useAsync(initialLoad?: boolean) {
  const [isLoading, setIsLoading] = useState<boolean>(initialLoad ?? false);

  const execute = useCallback(
    async <TArgs extends unknown[], TResult>(
      callback: (...args: TArgs) => Promise<TResult>,
      ...args: TArgs
    ) => {
      setIsLoading(true);

      try {
        return await callback(...args);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { isLoading, execute };
}
