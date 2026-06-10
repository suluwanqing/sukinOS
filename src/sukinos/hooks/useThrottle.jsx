import { useCallback,useEffect,useRef } from "react";
export const useThrottle = (fn, delay, deps = []) => {
  const lastCallRef = useRef(0);
  const timeoutRef = useRef(null);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  return useCallback((...args) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (timeSinceLastCall >= delay) {
      lastCallRef.current = now;
      fnRef.current(...args);
    } else {
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        fnRef.current(...args);
      }, delay - timeSinceLastCall);
    }
  }, [delay, ...deps]);
};
export default useThrottle
