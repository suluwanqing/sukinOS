import { useCallback, useEffect } from 'react'

// 绑定退出确认与保存；卸载时再兜底保存一次
export function useBeforeUnload(handleUnload) {
  const handleBeforeUnload = useCallback((e) => {
    e.preventDefault();
    e.returnValue = "确定离开当前页面吗？";
    return e.returnValue;
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    // pagehide 替代已弃用的 unload，避免 Permissions policy violation
    window.addEventListener('pagehide', handleUnload);
    return () => {
      handleUnload();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleUnload);
    }
  }, [handleUnload, handleBeforeUnload]);
}

export default useBeforeUnload
