import { useState, useEffect, useRef } from "react";

export function useIntersectionObserver<T extends Element>(
  options: IntersectionObserverInit | undefined,
) {
  const [isIntersecting, setIsIntersecting] = useState<boolean>(false);
  const elementRef = useRef<T | null>(null);

  useEffect(() => {
    const currentElement = elementRef.current;
    if (!currentElement) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(currentElement);

    return () => {
      console.log("Cleanup")
      observer.unobserve(currentElement);
    };
  }, [options]);

  return [elementRef, isIntersecting] as const
}
