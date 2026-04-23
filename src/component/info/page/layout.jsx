import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createNamespace } from '/utils/js/classcreate';
import style from './style.module.css';

const bem = createNamespace('general-page');

const contentMap = {
  '404': {
    defaultImageUrl: '/logo.jpg',
    defaultTitle: '404 Not Found',
    defaultDescription: '抱歉，您访问的页面不存在，请检查您输入的网址是否正确。',
  },
  '500': {
    defaultImageUrl: '/logo.jpg',
    defaultTitle: '服务器错误',
    defaultDescription: '服务器开小差了，工程师正在紧急修复中，请稍后再试。',
  },
  '403': {
    defaultImageUrl: '/logo.jpg',
    defaultTitle: '访问受限',
    defaultDescription: '抱歉，您没有权限访问该页面。',
  },
  'no-data': {
    defaultImageUrl: '/logo.jpg',
    defaultTitle: '暂无数据',
    defaultDescription: '这里空空如也，我们还没有找到任何内容。',
  },
  'redirect': {
    defaultImageUrl: '/logo.jpg',
    defaultTitle: '即将跳转',
    defaultDescription: '由于服务/设备原因,即将跳转。',
  },
  'update': {
    defaultImageUrl: '/logo.jpg',
    defaultTitle: '服务升级中',
    defaultDescription: '由于服务正在升级,请稍后重试。',
  }
};

export const GeneralPurposePage = (props) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 获取所有可能的参数来源
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const stateParams = location.state || {};

  // 定义参数获取辅助函数 (优先级: Props > Location State > URL Query Params)
  // 这样设计是为了让组件既可以作为普通组件被引用，也可以作为路由页面被跳转
  const getParam = (key, defaultValue = null) => {
    if (props[key] !== undefined) return props[key];
    if (stateParams[key] !== undefined) return stateParams[key];
    const queryVal = searchParams.get(key);
    return queryVal !== null ? queryVal : defaultValue;
  };

  // 提取基础内容参数
  const type = getParam('type', '404');
  const imageUrl = getParam('imageUrl');
  const title = getParam('title');
  const description = getParam('description');
  const actionText = getParam('actionText', '返回');

  // onActionClick 特殊处理：URL里传不过来函数，只能是字符串(路径)
  const paramActionClick = getParam('onActionClick');

  // 解析自动跳转配置
  const redirectConfig = useMemo(() => {
    // 尝试获取聚合对象形式的配置 (autoRedirect)
    let rawConfig = props.autoRedirect || stateParams.autoRedirect || searchParams.get('autoRedirect');
    let configObj = {};

    // 如果是 JSON 字符串 (通常来自 URL 或 searchParams)，尝试解析
    if (typeof rawConfig === 'string') {
      try {
        configObj = JSON.parse(rawConfig);
      } catch (e) {
        // 解析失败，忽略
      }
    } else if (typeof rawConfig === 'object' && rawConfig !== null) {
      configObj = rawConfig;
    }

    // 获取单独字段配置 (autoRedirectEnabled, etc...)
    // 注意：URL传参时 bool 和 number 都是字符串，需要转换
    const getBool = (val) => val === true || val === 'true';
    const getInt = (val, def) => {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? def : parsed;
    };

    const enabled = configObj.enabled ?? getBool(getParam('autoRedirectEnabled'));
    const path = configObj.path || getParam('autoRedirectPath') || '/';
    const delay = getInt(configObj.delay, 0) || getInt(getParam('autoRedirectDelay'), 5);

    return { enabled, path, delay };
  }, [props.autoRedirect, stateParams.autoRedirect, searchParams, props, stateParams]);

  // 倒计时状态管理
  const [countdown, setCountdown] = useState(redirectConfig.delay);

  // 监听配置变化重置倒计时
  useEffect(() => {
    setCountdown(redirectConfig.delay);
  }, [redirectConfig.delay]);

  // 倒计时逻辑
  useEffect(() => {
    if (!redirectConfig.enabled) return;

    if (countdown <= 0) {
      // 执行跳转
      if (redirectConfig.path.startsWith('http')) {
        window.location.replace(redirectConfig.path);
      } else {
        navigate(redirectConfig.path, { replace: true });
      }
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [redirectConfig.enabled, redirectConfig.path, countdown, navigate]);

  // 按钮点击处理
  const handleActionClick = () => {
    // 情况A: 传入的是函数 (只能通过 Props)
    if (typeof paramActionClick === 'function') {
      paramActionClick();
      return;
    }

    // 情况B: 传入的是路径字符串 (Props / State / Query)
    if (typeof paramActionClick === 'string' && paramActionClick.trim() !== '') {
        if (paramActionClick.startsWith('http')) {
            window.location.href = paramActionClick;
        } else {
            navigate(paramActionClick);
        }
        return;
    }

    // 情况C: 默认行为 (回退或回首页)
    if (window.history.length > 1) {
        navigate(-1);
    } else {
        navigate('/', { replace: true });
    }
  };

  // 内容渲染准备
  const defaults = contentMap[type] || contentMap['404'];
  const finalImageUrl = imageUrl || defaults.defaultImageUrl;
  const finalTitle = title || defaults.defaultTitle;
  const finalDescription = description || defaults.defaultDescription;

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('left')]}>
        <img
          src={finalImageUrl}
          alt={finalTitle}
          className={style[bem.e('image')]}
        />
      </div>
      <div className={style[bem.e('right')]}>
        <h1 className={style[bem.e('title')]}>{finalTitle}</h1>
        <p className={style[bem.e('description')]}>{finalDescription}</p>

        {redirectConfig.enabled && (
          <p className={style[bem.e('redirect-notice')]}>
            将在 <span>{countdown}</span> 秒后自动跳转...
          </p>
        )}

        {actionText && (
          <button className={style[bem.e('action')]} onClick={handleActionClick}>
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
};

export default GeneralPurposePage;
