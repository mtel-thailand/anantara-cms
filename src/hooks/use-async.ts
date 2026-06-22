import { useState } from "react";

export default function useAsync() {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const execute = async (callback: Function) => {
    setIsLoading(true);
    await callback();
    setIsLoading(false);
  };

  return { isLoading, execute };
}
