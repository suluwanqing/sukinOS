import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/sukinos/hooks/useAuth';
import Loading from '@/component/info/loding/layout';
const AuthGuard = ({ element, allowRoles = [] }) => {
  const { userRole, checkSession, isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  // 默认开启验证阻塞，防止组件挂载瞬间的错误跳转
  const [isVerifying, setIsVerifying] = useState(true);
  // 判定逻辑优化
  const isLoginPage = pathname === '/sukinos' || pathname === '/sukinos/';
  const isProtectedPath = pathname.startsWith('/sukinos') && !isLoginPage;
  useEffect(() => {
    let isMounted = true;
    const verify = async () => {
      // 如果是登录页路径，直接结束验证，不发起后端通信
      if (isLoginPage) {
        if (isMounted) setIsVerifying(false);
        return;
      }
      // 如果是系统保护路径，且当前 Redux 中没有用户信息
      if (isProtectedPath && !isAuthenticated) {
        setIsVerifying(true);
        // 执行后端同步校验
        await checkSession();
      }
      if (isMounted) setIsVerifying(false);
    };
    verify();
    return () => {
      isMounted = false;
    };
  }, [pathname, isLoginPage, isProtectedPath, checkSession, isAuthenticated]);

  // 后端校验期间，挂起渲染
  if (isVerifying) {
    return <Loading text="安全会话同步中..." />;
  }

  // 处理登录页跳转逻辑
  if (isLoginPage) {
    // 登录状态下访问登录页，重定向到桌面
    return isAuthenticated ? <Navigate to="/sukinos/deskbook" replace /> : element;
  }

  // 处理保护路径跳转逻辑
  if (isProtectedPath) {
    // 如果校验失败 (未登录)
    if (!isAuthenticated) {
      // console.log("未认证，重定向到登录页", pathname);
      return <Navigate to="/sukinos" state={{ from: pathname }} replace />;
    }
    // 权限检查
    if (allowRoles.length > 0 && !allowRoles.includes(userRole)) {
      return <Navigate to="/jump?title=权限不足" replace />;
    }
    return element;
  }

  // 非系统路径直接渲染
  return element;
};

export default AuthGuard;
