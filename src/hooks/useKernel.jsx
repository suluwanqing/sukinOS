import { useState, useEffect, useCallback } from "react";
import kernel from "@/utils/process/kernel";

const useKernel = () => {
  const [apps, setApps] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [runningApps, setRunnigApps] = useState([])
  const [hibernatedApps, setHibernatedApps] = useState([])
  const [blockEdApps,setBlockEdApps]=useState([])
  const refresh = useCallback(async () => {
    const list = await kernel.getApps();
    setApps(list);
    refreshAppStatus()
  }, []);
  const bootSystem = async () => {
    setLoading(true);
    const status= await kernel.init();
    setIsReady(status);
    if (status) {
      refresh();
    }
    setLoading(false);
  };
  const refreshAppStatus = () => {
    const running=kernel.getRunningApps()
    setRunnigApps(running)
    const hibernated = kernel.getHibernatedApps()
    setHibernatedApps(hibernated)
    const blockEd = kernel.getBlockEdApps()
    setBlockEdApps(blockEd)
  }
  useEffect(() => {
    if (!isReady) return;
    const unsub = kernel.subscribeSystem(refresh);
    refresh();
    return () => { unsub()};
  }, [isReady, refresh]);

  return {
    kernel, apps, isReady, loading, bootSystem, running: [...runningApps, ...hibernatedApps], runningApps, hibernatedApps,blockEdApps,
    startApp: (pid) => kernel.startProcess({ pid }),
    hibernateApp:(pid)=>kernel.hibernate(pid)
  };
};

export default useKernel;
