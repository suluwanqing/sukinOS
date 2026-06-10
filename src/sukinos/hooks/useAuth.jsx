import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { sukinOsActions, selectorUserInfo, selectVerificationData } from "@/sukinos/store";
import { asistant as asistantApi, login as loginApi, user as userApi } from '@/apis/auth';
import { alert } from '@/component/Alert/layout';
import generateShortSeed from "/utils/js/rootSeed"
import loginDateWs from '/utils/js/socket/loginDate/main'
// 引入全局的登录锁和定时器控制方法
import { authLock, startAutoRefresh, stopAutoRefresh } from '/utils/js/authLock';

// 'login' | 'recoverPassword'
export const useAuth = (bizType = 'login') => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // const { pathname } = useLocation();
  const userInfo = useSelector(selectorUserInfo);
  const verifyState = useSelector(selectVerificationData(bizType));
  const { endTime, isRunning, codeId, account: boundAccount, seed } = verifyState;

  // 内部 UI 状态
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSending, setIsSending] = useState(false);
  // 校验认证状态的 loading 标志，配合 Guard 使用，防止校验期间页面闪烁
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const autoRefreshStartedRef = useRef(false);

  // 验证码倒计时逻辑
  useEffect(() => {
    let timer = null;
    const calculate = () => {
      const remain = Math.ceil((endTime - Date.now()) / 1000);
      if (remain <= 0) {
        setTimeLeft(0);
        if (isRunning) dispatch(sukinOsActions.resetVerification(bizType));
        clearInterval(timer);
      } else {
        setTimeLeft(remain);
      }
    };

    if (isRunning && endTime > Date.now()) {
      calculate();
      timer = setInterval(calculate, 1000);
    } else {
      setTimeLeft(0);
    }
    return () => { if (timer) clearInterval(timer) };
  }, [endTime, isRunning, bizType, dispatch]);

  // 判定 logic 更加直接
  // 配合 Guard 使用时，只有双 Token 校验通过，userInfo 才会被保留/更新，否则会被置空。
  const isAuthenticated = useMemo(() => {
    // 增加空对象检查，确保 id 存在
    return !!(userInfo && userInfo.id);
  }, [userInfo]);

  const userRole = useMemo(() => userInfo?.role || 'guest', [userInfo]);

  // 当用户认证状态变化时，管理自动刷新 token 的生命周期
  useEffect(() => {
    if (isAuthenticated && !autoRefreshStartedRef.current) {
      // 用户已登录且尚未启动自动刷新，启动它
      autoRefreshStartedRef.current = true;
      startAutoRefresh();
    } else if (!isAuthenticated && autoRefreshStartedRef.current) {
      // 用户已登出，停止自动刷新
      autoRefreshStartedRef.current = false;
      stopAutoRefresh();
    }
  }, [isAuthenticated]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      // 调用全局方法停止
      stopAutoRefresh();
      autoRefreshStartedRef.current = false;
    };
  }, []);

  // 发送验证码
  const sendVerificationCode = useCallback(async (account, message) => {
    if (timeLeft > 0 || isSending) return false;
    setIsSending(true);
    // 重置之前的验证码状态（如果是重新发送）
    // 注意：这里不要完全 resetVerification，否则会清空倒计时状态导致 UI 闪烁，仅需清除错误信息等
    // dispatch(sukinOsActions.resetVerification(bizType));
    try {
      const res = await asistantApi.getVerificationCode({
        account,
        message: message || (bizType === 'recoverPassword' ? '重置密码' : '欢迎登录'),
        type: bizType,
        seed: generateShortSeed()
      });
      if (res.code === 200) {
        alert.success("验证码发送成功");
        dispatch(sukinOsActions.startVerificationCountdown({
          type: bizType,
          id: res.data.id,               // 后端生成的 codeId
          seed: res.data.seed,           // 后端原样返回的前端 seed
          account: res.data.account,
          limit: res.data.config?.limit  // 后端配置的动态频率限制秒数
        }));
        return true;
      } else {
        alert.failure(res.msg || res.message || "发送失败");
        return false;
      }
    } catch (e) {
      alert.warning("网络异常");
      return false;
    } finally {
      setIsSending(false);
    }
  }, [bizType, dispatch, isSending, timeLeft]);

  // 执行认证[登录或重置密码]
  const executeAuth = useCallback(async (mode, formData, onSuccess) => {
    const isCodeMode = mode === 'code' || mode === 'recoverPassword';
    const currentCodeId = isCodeMode ? codeId : null;
    if (isCodeMode && !currentCodeId) {
      alert.warning("请先获取验证码");
      return false;
    }
    try {
      const params = {
        type: mode === 'recoverPassword' ? 'code' : mode,
        account: isCodeMode ? boundAccount : formData.account,
        password: formData.password,
        code: formData.code,
        codeId: currentCodeId,
        remember: !!formData.remember,
        seed
      };
      const res = await loginApi(params);
      if (res.code === 200) {
        const userData = res.user || res.data;
        alert.success(res.msg || res.message || "操作成功");
        if (mode !== 'recoverPassword') {
          dispatch(sukinOsActions.setUserInfo(userData));
          loginDateWs.createWsDate(userData?.id)
        }
        dispatch(sukinOsActions.resetVerification(bizType));
        if (onSuccess) {
          onSuccess(userData);
        } else if (mode !== 'recoverPassword') {
          // 登录成功后跳转到系统桌面
          // 直接跳转，不使用 setTimeout，避免竞态条件
          navigate('/sukinos/deskbook', { replace: true });
        }
        return true;
      } else {
        alert.failure(res.msg || res.message || "操作失败");
        return false;
      }
    } catch (err) {
      // console.error(err);
      alert.failure("系统响应异常");
      return false;
    }
  }, [bizType, codeId, boundAccount, dispatch, navigate]);

  // 校验 Session
  // 强制向后端发起校验。结合你的双 Token Axios 拦截器，
  // 哪怕 accToken 过期，只要 refresh 成功，这里仍然返回 200。
  // 一旦 refresh 也失败，就会进入 catch，立刻清除本地残留的 userInfo。
  const checkSession = useCallback(async () => {
    // 如果正在登出，直接返回 false，不重新认证
    if (authLock.isLoggingOut) {
      // console.log("[useAuth] 检测到正在登出，跳过会话同步");
      return false;
    }

    setIsCheckingAuth(true);
    try {
      const res = await userApi.checkToken();

      // 再次检查是否在登出过程中（处理异步竞态）
      if (authLock.isLoggingOut) {
        return false;
      }
      if (res.code === 200) {
        dispatch(sukinOsActions.setUserInfo(res.user || res.data));
        loginDateWs.createWsDate(res?.user?.id)
        return true;
      }
      dispatch(sukinOsActions.setUserInfo({}));
      return false;
    } catch (err) {
      dispatch(sukinOsActions.setUserInfo({}));
      return false;
    } finally {
      setIsCheckingAuth(false);
    }
  }, [dispatch]);

  // 退出登录
  const logout = useCallback(async () => {
    // 置全局登出锁，屏蔽所有 Axios 静默刷新和 Hook 鉴权
    authLock.isLoggingOut = true;

    try {
      // 先清空 Redux 状态
      dispatch(sukinOsActions.setUserInfo({}));
       loginDateWs.destroyWSInstance()
      // 向后端请求登出
      const res = await userApi.logout();

      alert.success("已安全退出");
      navigate('/sukinos', { replace: true });
    } catch (err) {
      // console.error('登出请求失败:', err);
      dispatch(sukinOsActions.setUserInfo({}));
      navigate('/sukinos', { replace: true });
      alert.warning("已强制清除本地登录状态");
    } finally {
      // 延迟释放锁，确保路由跳转完成且 AuthGuard 的 useEffect 已运行完毕
      setTimeout(() => {
        authLock.isLoggingOut = false;
      }, 2000);
    }
  }, [dispatch, navigate]);

  return {
    userInfo,
    isAuthenticated,
    isCheckingAuth,
    userRole,
    timeLeft,
    isSending,
    sendVerificationCode,
    executeAuth,
    checkSession,
    logout
  };
};
