import { useState, useEffect, useCallback } from "react";
import kernel from "@/utils/process/kernel";

const useProcessBridge = (pid) => {
  const [state, setState] = useState(null);
  useEffect(() => {
    if (!pid) return;
    const unsubscribe = kernel.subscribeApp(pid, (msg) => {
      if (msg.type === 'STATE') setState(msg.payload);
    });
    return () => unsubscribe();
  }, [pid]);

  const dispatch = useCallback((action) => kernel.dispatch(pid, action), [pid]);
  return { state, dispatch };
};

export default useProcessBridge;
