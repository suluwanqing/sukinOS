import { useCallback,useEffect,useRef } from "react";
export const useDebounce = (fn, delay, deps = []) => {
  const timeoutRef = useRef(null);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      fnRef.current(...args);
    }, delay);
  }, [delay, ...deps]);
};
export default useDebounce
