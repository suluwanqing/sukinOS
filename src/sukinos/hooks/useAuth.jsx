import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { sukinOsActions, selectorUserInfo, selectorRoutePermissionsLoaded, selectVerificationData } from "@/sukinos/store";
import { asistant as asistantApi, login as loginApi, user as userApi } from '@/apis/auth';
import permissionManageAPI from "@/apis/system/permissionManage";
import { updateRoutePermissionCache } from '@/middleware/routePermission/cache';
import { alert } from '@/component/alert/layout';
import generateShortSeed from "/utils/js/rootSeed"
import loginDateWs from '/utils/js/socket/loginDate/main'
import { authLock, startAutoRefresh, stopAutoRefresh } from '/utils/js/authLock';
import kernel from '@/sukinos/utils/process/kernel'
import { DEFAULT_USER_ID } from '@/sukinos/utils/config'
import { GUEST_INFO, checkIsGuest, setGuestFlag, clearGuestFlag } from '/utils/js/guest';

// 'login' | 'recoverPassword'
export const useAuth = (bizType = 'login') => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userInfo = useSelector(selectorUserInfo);
  const verifyState = useSelector(selectVerificationData(bizType));
  const { endTime, isRunning, codeId, account: boundAccount, seed } = verifyState;

  const [timeLeft, setTimeLeft] = useState(0);
  const [isSending, setIsSending] = useState(false);
  // 校验认证状态的 loading 标志，配合 Guard 使用，防止校验期间页面闪烁
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const autoRefreshStartedRef = useRef(false);

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

  // 配合 Guard 使用时，只有双 Token 校验通过，userInfo 才会被保留/更新，否则会被置空。
  const isAuthenticated = useMemo(() => {
    return !!(userInfo && userInfo.id);
  }, [userInfo]);

  const userRole = useMemo(() => userInfo?.role || 'guest', [userInfo]);

  // 当用户认证状态变化时，管理自动刷新 token 的生命周期
  useEffect(() => {
    if (checkIsGuest()) {
      stopAutoRefresh();
      autoRefreshStartedRef.current = false;
      return;
    }

    if (isAuthenticated && !autoRefreshStartedRef.current) {
      autoRefreshStartedRef.current = true;
      startAutoRefresh();
    } else if (!isAuthenticated && autoRefreshStartedRef.current) {
      autoRefreshStartedRef.current = false;
      stopAutoRefresh();
    }
  }, [isAuthenticated]);

  // 卸载时停掉自动刷新
  useEffect(() => {
    return () => {
      stopAutoRefresh();
      autoRefreshStartedRef.current = false;
    };
  }, []);

  const sendVerificationCode = useCallback(async (account, message) => {
    if (timeLeft > 0 || isSending) return false;
    setIsSending(true);
    // 注意：这里不要完全 resetVerification，否则会清空倒计时状态导致 UI 闪烁，仅需清除错误信息等
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
          clearGuestFlag();
          dispatch(sukinOsActions.setUserInfo(userData));
          kernel.reinit(userData?.id)
          loginDateWs.createWsDate(userData?.id)
          permissionManageAPI.getRoutePermissions().then(permRes => {
            if (permRes.code === 200 && permRes.data) {
              dispatch(sukinOsActions.setRoutePermissions(permRes.data));
              updateRoutePermissionCache(permRes.data);
            }
          }).catch(() => {});
        }
        dispatch(sukinOsActions.resetVerification(bizType));
        if (onSuccess) {
          onSuccess(userData);
        } else if (mode !== 'recoverPassword') {
          // 直接跳转，不使用 setTimeout，避免竞态条件
          navigate('/sukinos/deskbook', { replace: true });
        }
        return true;
      } else {
        alert.failure(res.msg || res.message || "操作失败");
        return false;
      }
    } catch (err) {
      alert.failure("系统响应异常");
      return false;
    }
  }, [bizType, codeId, boundAccount, dispatch, navigate]);

  // 校验 Session：强制走后端。配合双 Token 的 Axios 拦截器，access token 过期但 refresh 成功时这里仍返回 200；
  // 只有 refresh 也失败才进 catch，清掉本地残留的 userInfo。
  const checkSession = useCallback(async () => {
    if (authLock.isLoggingOut) {
      return false;
    }

    // 游客模式直接恢复游客状态，不必调后端
    if (checkIsGuest()) {
      dispatch(sukinOsActions.setUserInfo(GUEST_INFO));
      await kernel.reinit(DEFAULT_USER_ID);
      return true;
    }

    setIsCheckingAuth(true);
    try {
      const res = await userApi.checkToken();

      // 再次检查是否在登出过程中（处理异步竞态）
      if (authLock.isLoggingOut) {
        return false;
      }
      if (res.code === 200) {
        const userData = res.user || res.data
        dispatch(sukinOsActions.setUserInfo(userData));
        if (kernel.currentUser?.id !== userData?.id) {
          kernel.reinit(userData?.id)
        }
        loginDateWs.createWsDate(userData?.id)
        permissionManageAPI.getRoutePermissions().then(permRes => {
          if (permRes.code === 200 && permRes.data) {
            dispatch(sukinOsActions.setRoutePermissions(permRes.data));
            updateRoutePermissionCache(permRes.data);
          }
        }).catch(() => {});
        return true;
      }
      dispatch(sukinOsActions.setUserInfo({}));
      kernel.reinit(DEFAULT_USER_ID)
      return false;
    } catch (err) {
      dispatch(sukinOsActions.setUserInfo({}));
      kernel.reinit(DEFAULT_USER_ID)
      return false;
    } finally {
      setIsCheckingAuth(false);
    }
  }, [dispatch]);

  const guestLogin = useCallback(async () => {
    // 顺序要紧：先落本地游客标记，再派发 Redux 状态
    setGuestFlag();
    dispatch(sukinOsActions.setUserInfo(GUEST_INFO));
    await kernel.reinit(DEFAULT_USER_ID);
    navigate('/sukinos/deskbook', { replace: true });
  }, [dispatch, navigate]);

  const logout = useCallback(async () => {
    // 置全局登出锁，屏蔽所有 Axios 静默刷新和 Hook 鉴权
    authLock.isLoggingOut = true;

    try {
      dispatch(sukinOsActions.setUserInfo({}));
      kernel.reinit(DEFAULT_USER_ID)
      loginDateWs.destroyWSInstance()

      clearGuestFlag();

      await userApi.logout();

      alert.success("已安全退出");
      navigate('/sukinos', { replace: true });
    } catch (err) {
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
    guestLogin,
    logout
  };
};
