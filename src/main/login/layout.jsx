import { useState, useEffect } from 'react';
import {
  GitHub,
  MailOutline,
  LockOutlined,
  PhoneIphone,
  VerifiedUserOutlined,
  Google,
  Twitter
} from '@mui/icons-material';
import style from "./style.module.css";
import { createNamespace } from '@/utils/js/classcreate';
import Form from './form/layout';
import { alert } from "@/component/alert/layout"
import { USER_ADMIN } from '@/utils/config';
import { adminActions } from "@/store"
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectorUserInfo } from "@/store"
import { useSelector } from "react-redux"
const bem = createNamespace('admin-login-layout');
const TITLE_META = {
  login: {
    title: '登录',
    sub: ''
  },
  recoverPassword: {
    title: '重置密码',
    sub: ''
  }
};

const LOGIN_CONFIG = {
  fields: {
    account: [
      {
        name: 'account',
        type: 'text',
        placeholder: '账号 / 邮箱 / 手机号 ',
        icon: <MailOutline fontSize="small" />,
        rules: {
          required: true,
          message: '请输入账户信息'
        }
      },
      {
        name: 'password',
        type: 'password',
        placeholder: '请输入密码',
        icon: <LockOutlined fontSize="small" />,
        isPassword: true,
        rules: {
          required: true,
          minLength: 6,
          message: '密码长度不能少于6位'
        }
      }
    ],
    code: [
      {
        name: 'account',
        type: 'tel',
        placeholder: '请输入手机号 / 邮箱',
        icon: <PhoneIphone fontSize="small" />,
        rules: {
          required: true,
          pattern: /^(1[3-9]\d{9}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/,
          message: '请输入正确的手机号 / 邮箱'
        }
      },
      {
        name: 'code',
        type: 'code',
        placeholder: '请输入验证码',
        icon: <VerifiedUserOutlined fontSize="small" />,
        rules: {
          required: true,
          maxLength: 6,
          message: '验证码错误'
        }
      }
    ],
    recoverPassword: [
      {
        name: 'account',
        type: 'text',
        placeholder: '请输入手机号 / 邮箱',
        icon: <PhoneIphone fontSize="small" />,
        rules: {
          required: true,
          pattern: /^(1[3-9]\d{9}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/,
          message: '请输入您的手机号 / 邮箱'
        }
      },
      {
        name: 'code',
        type: 'code',
        placeholder: '请输入验证码',
        icon: <VerifiedUserOutlined fontSize="small" />,
        rules: {
          required: true,
          maxLength: 6,
          message: '验证码错误'
        }
      }, {
        name: 'password',
        type: 'password',
        placeholder: '请输入密码',
        icon: <LockOutlined fontSize="small" />,
        isPassword: true,
        rules: {
          required: true,
          minLength: 6,
          message: '密码长度不能少于6位'
        }
      }
    ]
  },
  thirdParty: [
    { key: 'github', icon: <GitHub fontSize="small" /> },
    { key: 'google', icon: <Google fontSize="small" /> },
    { key: 'twitter', icon: <Twitter fontSize="small" /> },
  ]
};

const Actions = ({ activeMode, remember, onSwitchMode, onToggleRemember }) => {
  if (activeMode === 'recoverPassword') return null;

  return (
    <div className={style[bem.e('actions')]}>
      <div className={style[bem.e('checkbox')]} onClick={onToggleRemember}>
        <div><div className={style[bem.is('remember', remember)]}></div></div> 记住我
      </div>
      <span className={style[bem.e('mode-switch')]} onClick={() => onSwitchMode(activeMode === 'account' ? 'code' : 'account')}>
        {activeMode === 'account' ? '验证码登录' : '账号密码登录'}
      </span>
    </div>
  );
};

const FooterLinks = ({ activeMode, onSwitchMode }) => {
  const handleClick = () => {
    onSwitchMode(activeMode === 'recoverPassword' ? 'account' : 'recoverPassword');
  };

  return (
    <div className={style[bem.e('footer-links')]}>
      <span className={style[bem.e('link')]} onClick={handleClick}>
        {activeMode === 'recoverPassword' ? '返回登录' : '忘记密码?'}
      </span>
    </div>
  );
};

const Divider = () => (
  <div className={style[bem.e('divider')]}>
    <span>其他方式登录</span>
  </div>
);

const SocialButtons = () => (
  <div className={style[bem.e('socials')]}>
    {LOGIN_CONFIG.thirdParty.map(item => (
      <div key={item.key} className={style[bem.e('social-btn')]}>
        {item.icon}
      </div>
    ))}
  </div>
);

function LoginLayout() {
  const userInfo = useSelector(selectorUserInfo);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState('account');
  const [formData, setFormData] = useState({
    //简单处理验证
    account: USER_ADMIN.account, // 默认账号
    password: USER_ADMIN.password, // 默认密码
    code: USER_ADMIN.code // 默认验证码
  });
  const [errors, setErrors] = useState({});
  const [remember, setRemember] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 检查用户是否已登录，如果已登录则跳转到/deskbook
  useEffect(() => {
    // 简单处理userInfo：如果userInfo存在且不等于默认值，认为用户已登录
    if (userInfo &&
        (userInfo.account !== USER_ADMIN.account ||
         userInfo.password !== USER_ADMIN.password ||
         userInfo.code !== USER_ADMIN.code)) {
      navigate('/deskbook');
    }
  }, [userInfo, navigate]);

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleClear = (name) => {
    setFormData(prev => ({ ...prev, [name]: '' }));
  };

  const handleSwitchMode = (value) => {
    const newMode = value;
    setActiveMode(newMode);
    // 切换模式时设置对应的默认值
    if (newMode === 'account') {
      setFormData({
        account: USER_ADMIN.account,
        password: USER_ADMIN.password
      });
    } else if (newMode === 'code') {
      setFormData({
        account: USER_ADMIN.phone,
        code: USER_ADMIN.code
      });
    } else if (newMode === 'recoverPassword') {
      setFormData({
        account: USER_ADMIN.phone,
        code: USER_ADMIN.code,
        password: USER_ADMIN.password
      });
    }
    setErrors({});
  };

  const validate = (fieldKey) => {
    const currentFields = LOGIN_CONFIG.fields[activeMode];
    let newErrors = {};
    let isValid = true;

    if (fieldKey) {
      newErrors = { ...errors };
      const field = currentFields.find(f => f.name === fieldKey);
      if (field) {
        const value = formData[field.name] || '';
        delete newErrors[field.name];

        if (field.rules.required && !value) {
          newErrors[field.name] = field.rules.message || '此项不能为空';
        } else if (field.rules.pattern && !field.rules.pattern.test(value)) {
          newErrors[field.name] = field.rules.message;
        } else if (field.rules.minLength && value.length < field.rules.minLength) {
          newErrors[field.name] = field.rules.message;
        }
      }
    } else {
      currentFields.forEach(field => {
        const value = formData[field.name] || '';
        if (field.rules.required && !value) {
          newErrors[field.name] = field.rules.message || '此项不能为空';
          isValid = false;
        } else if (field.rules.pattern && !field.rules.pattern.test(value)) {
          newErrors[field.name] = field.rules.message;
          isValid = false;
        } else if (field.rules.minLength && value.length < field.rules.minLength) {
          newErrors[field.name] = field.rules.message;
          isValid = false;
        }
      });
    }
    setErrors(newErrors);
    return fieldKey ? !newErrors[fieldKey] : isValid;
  };

  // 发送验证码
  const sendCode = async () => {
    if (!validate('account')) {
      return;
    }

    if (countdown > 0) return;

    setIsSendingCode(true);

    // 模拟API调用延迟
    setTimeout(() => {
      const account = formData?.account;
      alert.success('发送验证码到:', account);

      // 开始倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsSendingCode(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      alert.success('验证码发送成功，测试验证码为:', USER_ADMIN.code);
    }, 1000);
  };

  // 验证登录信息
  const validateLogin = () => {
    const { account, password, code } = formData;

    if (activeMode === 'account') {
      // 账号密码登录验证
      if (account === USER_ADMIN.account && password === USER_ADMIN.password) {
        return { success: true, message: '登录成功' };
      }
      return { success: false, message: '账号或密码错误' };
    } else if (activeMode === 'code') {
      // 验证码登录验证
      if ((account === USER_ADMIN.phone || account === USER_ADMIN.account) && code === USER_ADMIN.code) {
        return { success: true, message: '登录成功' };
      }
      return { success: false, message: '手机号或验证码错误' };
    } else if (activeMode === 'recoverPassword') {
      // 重置密码验证
      if ((account === USER_ADMIN.phone || account === USER_ADMIN.account) && code === USER_ADMIN.code) {
        if (password.length >= 6) {
          return { success: true, message: '密码重置成功' };
        }
        return { success: false, message: '密码长度不能少于6位' };
      }
      return { success: false, message: '手机号或验证码错误' };
    }

    return { success: false, message: '未知错误' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = validateLogin();

    if (result.success) {
      alert.success(result.message);

      if (activeMode === 'recoverPassword') {
        handleSwitchMode('account');
      } else {
        // 登录成功后的处理 - 使用 adminActions.setUserInfo 存入用户信息
        // 简单处理：如果用户信息不等于默认值，就认为是已登录状态
        const userData = { ...USER_ADMIN };
        dispatch(adminActions.setUserInfo(userData));
        navigate('/deskbook');
      }
    } else {
      alert.failure(result.message);
    }
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('container')]}>
        <div className={style[bem.e('header')]}>
          <div className={style[bem.e('title')]}>{activeMode !=='recoverPassword' ?  TITLE_META.login.title  : TITLE_META.recoverPassword.title  }</div>
          <div className={style[bem.e('subtitle')]}>{activeMode !=='recoverPassword' ?  TITLE_META.login.sub  : TITLE_META.recoverPassword.sub  }</div>
        </div>

        <form onSubmit={handleSubmit}>
          <Form
            fields={LOGIN_CONFIG.fields[activeMode]}
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
            onClear={handleClear}
            setRemember={() => setRemember(!remember)}
            remember={remember}
            handleSwitchMode={handleSwitchMode}
            activeMode={activeMode}
            sendCode={sendCode}
            isSendingCode={isSendingCode}
            countdown={countdown}
          />

          <Actions
            activeMode={activeMode}
            remember={remember}
            onSwitchMode={handleSwitchMode}
            onToggleRemember={() => setRemember(!remember)}
          />

          <button type="submit" className={style[bem.e('submit')]}>
            {activeMode === 'recoverPassword' ? '重置密码' : '登录'}
          </button>
        </form>

        <FooterLinks
          activeMode={activeMode}
          onSwitchMode={handleSwitchMode}
        />

        <Divider />
        <SocialButtons />
      </div>
    </div>
  );
}

export default LoginLayout;
