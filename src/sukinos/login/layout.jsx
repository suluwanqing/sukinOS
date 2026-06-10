import { useState } from 'react';
import {
  MailOutline, LockOutlined,
  VerifiedUserOutlined
} from '@mui/icons-material';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import Form from './form/layout';
import { useAuth } from '@/sukinos/hooks/useAuth';

const bem = createNamespace('sukinos-login-layout');
const TITLE_META = {
  login: { title: 'SYS.LOGIN', sub: '' },
  recoverPassword: { title: 'RESET.SEQ', sub: '' }
}

const LOGIN_CONFIG = {
  fields: {
    account: [
      { name: 'account', type: 'text', placeholder: '账号 / 邮箱 ', icon: <MailOutline fontSize="small" />, rules: { required: true, message: '请输入账户信息' } },
      { name: 'password', type: 'password', placeholder: '请输入密码', icon: <LockOutlined fontSize="small" />, isPassword: true, rules: { required: true, minLength: 6, message: '密码长度不能少于6位' } }
    ],
    code: [
      {
        name: 'account', type: 'text', placeholder: '邮箱', icon: <MailOutline fontSize="small" />,
        rules: {
          required: true, pattern: /^(1[3-9]\d{9}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/,
          message: '请输入正确的邮箱'
        }
      },
      {
        name: 'code', type: 'text', placeholder: '请输入验证码', icon: <VerifiedUserOutlined fontSize="small" />,
        rules: { required: true, maxLength: 6, message: '验证码错误' }
      }
    ],
    recoverPassword: [
      { name: 'account', type: 'text', placeholder: '请输入邮箱', icon: <MailOutline fontSize="small" />, rules: { required: true, pattern: /^(1[3-9]\d{9}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/, message: '请输入您的手机号 / 邮箱' } },
      { name: 'code', type: 'text', placeholder: '请输入验证码', icon: <VerifiedUserOutlined fontSize="small" />, rules: { required: true, maxLength: 6, message: '验证码错误' } },
      { name: 'password', type: 'password', placeholder: '请输入新密码', icon: <LockOutlined fontSize="small" />, isPassword: true, rules: { required: true, minLength: 6, message: '密码长度不能少于6位' } }
    ]
  },
   thirdParty: [
    // { key: 'github', icon: <GitHub fontSize="small" /> },
    // { key: 'google', icon: <Google fontSize="small" /> },
    // { key: 'twitter', icon: <Twitter fontSize="small" /> },
  ]
};

// 全局缓存状态，防止弹窗关闭（组件卸载）再打开时数据丢失
const globalCachedState = {
  activeMode: 'code',
  formData: {},
  remember: false
};

const Actions = ({ activeMode, remember, onSwitchMode, onToggleRemember }) => {
  if (activeMode === 'recoverPassword') return null;
  return (
    <div className={style[bem.e('actions')]}>
      <div className={style[bem.e('checkbox')]} onClick={onToggleRemember}>
        <div className={style[bem.e('checkbox-box')]}>
          <div className={remember ? style['is-remember'] : ''}></div>
        </div>
        记住我
      </div>
      <span className={style[bem.e('mode-switch')]} onClick={() => onSwitchMode(activeMode === 'account' ? 'code' : 'account')}>
        {activeMode === 'account' ? '验证码登录' : '账号密码登录'}
      </span>
    </div>
  );
};

const FooterLinks = ({ activeMode, onSwitchMode }) => (
  <div className={style[bem.e('footer-links')]}>
    <span className={style[bem.e('link')]} onClick={() => onSwitchMode(activeMode === 'recoverPassword' ? 'account' : 'recoverPassword')}>
      {activeMode === 'recoverPassword' ? '返回登录' : '忘记密码?'}
    </span>
  </div>
);

const Divider = () => <div className={style[bem.e('divider')]}><span>其他方式登录</span></div>;

const SocialButtons = () => (
  <div className={style[bem.e('socials')]}>
    {LOGIN_CONFIG.thirdParty.map(item => <div key={item.key} className={style[bem.e('social-btn')]}>{item.icon}</div>)}
  </div>
);

function LoginLayout() {
  const [activeMode, setActiveMode] = useState(globalCachedState.activeMode);
  const [formData, setFormData] = useState(globalCachedState.formData);
  const [errors, setErrors] = useState({});
  const [remember, setRemember] = useState(globalCachedState.remember);

  const bizType = activeMode === 'recoverPassword' ? 'recoverPassword' : 'login';
  const { timeLeft, isSending, sendVerificationCode, executeAuth } = useAuth(bizType);

  //更新数据状态，并同步到全局缓存
  const handleInputChange = (name, value) => {
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      globalCachedState.formData = newData;
      return newData;
    });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  //登录方式改变,重置错误状态但保留数据，并同步缓存
  const handleModeSwitch = (newMode) => {
    setActiveMode(newMode);
    globalCachedState.activeMode = newMode;
    setErrors({});
  };

  //切换记住我状态，并同步缓存
  const handleToggleRemember = () => {
    setRemember(prev => {
      const newVal = !prev;
      globalCachedState.remember = newVal;
      return newVal;
    });
  };

  //校验表单
  const validate = (fieldKey) => {
    const currentFields = LOGIN_CONFIG.fields[activeMode];
    let newErrors = {};
    let isValid = true;

    const check = (field) => {
      const val = formData[field.name] || '';
      if (field.rules.required && !val) return field.rules.message;
      if (field.rules.pattern && !field.rules.pattern.test(val)) return field.rules.message;
      if (field.rules.minLength && val.length < field.rules.minLength) return field.rules.message;
      if (field.rules.maxLength && val.length > field.rules.maxLength) return field.rules.message;
      return null;
    };

    if (fieldKey) {
      newErrors = { ...errors };
      const f = currentFields.find(f => f.name === fieldKey);
      if (f) {
        const err = check(f);
        if (err) newErrors[f.name] = err; else delete newErrors[f.name];
      }
    } else {
      currentFields.forEach(f => {
        const err = check(f);
        if (err) { newErrors[f.name] = err; isValid = false; }
      });
    }
    setErrors(newErrors);
    return fieldKey ? !newErrors[fieldKey] : isValid;
  };

  //发送验证码
  const onSendCode = async () => {
    if (validate('account')) {
      await sendVerificationCode(formData.account);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (validate()) {
      await executeAuth(activeMode, { ...formData, remember });
    }
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('container')]}>
        <div className={style[bem.e('header')]}>
          <div className={style[bem.e('title')]}>
            {activeMode !== 'recoverPassword' ? TITLE_META.login.title : TITLE_META.recoverPassword.title}
          </div>
        </div>
        <form onSubmit={onSubmit}>
          <Form
            fields={LOGIN_CONFIG.fields[activeMode]}
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
            onClear={(n) => setFormData(p => {
              const newData = { ...p, [n]: '' };
              globalCachedState.formData = newData;
              return newData;
            })}
            sendCode={onSendCode}
            countdown={timeLeft}
            isSending={isSending}
          />
          <Actions
            activeMode={activeMode}
            remember={remember}
            onSwitchMode={handleModeSwitch}
            onToggleRemember={handleToggleRemember}
          />
          <button type="submit" className={style[bem.e('submit')]} disabled={isSending}>
            {activeMode === 'recoverPassword' ? '重置密码' : '登录'}
          </button>
        </form>
        <FooterLinks activeMode={activeMode} onSwitchMode={handleModeSwitch} />
        <SocialButtons />
      </div>
    </div>
  );
}

export default LoginLayout;
