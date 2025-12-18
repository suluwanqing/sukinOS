import { useState } from 'react';
import style from './style.module.css';
import { createNamespace } from '@/utils/js/classcreate';
import LoginIcon from '@mui/icons-material/Login';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BadgeIcon from '@mui/icons-material/Badge';
const bem = createNamespace('login');
export default function Login({ onLogin }) {
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userId.trim() || !userName.trim()) {
      alert("请输入用户ID和名称");
      return;
    }
    onLogin(userId.trim(), userName.trim());
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('container')]}>
        <div className={style[bem.e('header')]}>
          <h1 className={style[bem.e('title')]}>开发者登录</h1>
          <p className={style[bem.e('subtitle')]}>请输入您的凭据以继续</p>
        </div>

        <form className={style[bem.e('form')]} onSubmit={handleSubmit}>
          <div className={style[bem.e('form-group')]}>
            <div className={style[bem.e('input-wrapper')]}>
              <BadgeIcon className={style[bem.e('input-icon')]} />
              <input
                id="userId"
                className={style[bem.e('input')]}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="user001"
                autoComplete="off"
                spellCheck="false"
              />
              <label className={style[bem.e('label')]} htmlFor="userId">
                用户 ID
              </label>
            </div>
          </div>

          <div className={style[bem.e('form-group')]}>
            <div className={style[bem.e('input-wrapper')]}>
              <PersonOutlineIcon className={style[bem.e('input-icon')]} />
              <input
                id="userName"
                className={style[bem.e('input')]}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Sukin"
                autoComplete="off"
                spellCheck="false"
              />
              <label className={style[bem.e('label')]} htmlFor="userName">
                用户名称
              </label>
            </div>
          </div>

          <button
            type="submit"
            className={style[bem.e('submit-btn')]}
            disabled={!userId.trim() || !userName.trim()}
          >
            <LoginIcon className={style[bem.e('btn-icon')]} />
            登录
          </button>
        </form>
      </div>
    </div>
  );
}
