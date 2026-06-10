import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';

import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import SecurityIcon from '@mui/icons-material/Security';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

import { user as userApi } from '@/apis/main';
import auth from '@/apis/auth';
import { sukinOsActions, selectorUserInfo, selectVerificationData } from '@/sukinos/store';
import { alert } from '@/component/Alert/layout';
import { DEFAULT_USER_AVATOR_URL } from "@/sukinos/utils/config";
import generateShortSeed from "/utils/js/rootSeed";


import { useAuth } from '@/sukinos/hooks/main';

const bem = createNamespace('setting-user');

const UserSettings = () => {
  const dispatch = useDispatch();
  const userInfo = useSelector(selectorUserInfo);

  // 实例化 useAuth hook 以使用登出功能
  const { logout } = useAuth();

  // 仅保留密码修改的验证状态
  const passwordCodeData = useSelector(selectVerificationData('updatePassword'));
  const { seed } = passwordCodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [passwordStep, setPasswordStep] = useState(0);
  const [verifyCode, setVerifyCode] = useState('');

  const [formData, setFormData] = useState({});
  const [passwordData, setPasswordData] = useState({ new_password: '', confirm_password: '' });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [passwordCountdown, setPasswordCountdown] = useState(0);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (userInfo) {
      setFormData({
        username: userInfo.username || '',
        email: userInfo.email || '',
        age: userInfo.age || '',
        name: userInfo.name || '',
        sex: userInfo.sex || '',
        phone: userInfo.phone || '',
        address: userInfo.address || '',
      });
      setAvatarPreview(userInfo.avatar || userInfo.avatar_url || DEFAULT_USER_AVATOR_URL);
    }
  }, [userInfo]);

  // 新增逻辑：如果检测到修改密码有倒计时（说明验证码发送中或者未过期），自动展开修改密码页面
  useEffect(() => {
    if (passwordCodeData.isRunning && passwordStep === 0) {
      setPasswordStep(1);
    }
  }, [passwordCodeData.isRunning, passwordStep]);

  useEffect(() => {
    let timer;
    if (passwordCodeData.isRunning) {
      const updateTimer = () => {
        const remaining = Math.ceil((passwordCodeData.endTime - Date.now()) / 1000);
        if (remaining > 0) {
          setPasswordCountdown(remaining);
        } else {
          setPasswordCountdown(0);
          dispatch(sukinOsActions.resetVerification('updatePassword'));
          clearInterval(timer);
        }
      };
      updateTimer();
      timer = setInterval(updateTimer, 1000);
    } else {
      setPasswordCountdown(0);
    }
    return () => clearInterval(timer);
  }, [passwordCodeData, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file); // 存储原始 File 对象
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    if (userInfo) {
      setFormData({
        username: userInfo.username || '',
        email: userInfo.email || '',
        age: userInfo.age || '',
        name: userInfo.name || '',
        sex: userInfo.sex || '',
        phone: userInfo.phone || '',
        address: userInfo.address || '',
      });
      setAvatarFile(null);
      setAvatarPreview(userInfo.avatar || userInfo.avatar_url || DEFAULT_USER_AVATOR_URL);
    }
  };

  const resetPasswordState = () => {
    setPasswordStep(0);
    setVerifyCode('');
    setPasswordData({ new_password: '', confirm_password: '' });
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSendCode = async (type) => {
    const targetAccount = userInfo.email || userInfo.phone;
    if (!targetAccount) {
      alert.warning("未绑定邮箱或手机号，无法获取验证码");
      return;
    }
    const message = '修改账户密码验证';

    try {
      const res = await auth.asistant.getVerificationCode({
        account: targetAccount,
        type: type,
        message: message,
        seed:generateShortSeed()
      });

      if (res.code === 200) {
        alert.success("验证码发送成功");
        dispatch(sukinOsActions.startVerificationCountdown({
          type: type,
          id: res.data?.id || res.data?.codeId || null, // 后端生成的 codeId
          seed: res.data?.seed,                         // 后端原样返回的前端 seed
          account: targetAccount,                       // 目标账号
          limit: res.data?.config?.limit                // 后端配置的动态频率限制 (秒)
        }));
        if (passwordStep === 0) setPasswordStep(1);
      } else {
        alert.failure(res.msg || "发送失败");
      }
    } catch (err) {
      console.error(err);
      alert.failure("验证码请求失败");
    }
  };
const handleSaveProfile = async () => {
  setIsLoading(true);
  try {
    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      const value = formData[key];

      // 关键：只有当值不是空字符串、不是 null、不是 undefined 时才发送
      if (value !== '' && value !== null && value !== undefined) {
        submitData.append(key, value);
      }
    });
    if (avatarFile) {
      submitData.append('avatar_file', avatarFile);
    }
    // 调用 API
    const response = await userApi.updateUserInfo({ submitData, seed });
    if (response.code === 200) {
      const updatedUser = response.data?.data;
      if (updatedUser) {
        dispatch(sukinOsActions.setUserInfo(updatedUser));
        alert.success('个人资料更新成功！');
      }
      setIsEditing(false);
      setAvatarFile(null);
    } else {
      alert.failure(response.msg || '更新失败');
    }
  } catch (error) {
    console.error('更新个人资料失败:', error);
    alert.failure('资料更新异常');
  } finally {
    setIsLoading(false);
  }
};

  const handleSavePassword = async () => {
    if (!passwordData.new_password || !passwordData.confirm_password || !verifyCode) {
      alert.warning('请完整填写密码和验证码');
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      alert.warning('两次输入的新密码不一致');
      return;
    }
    if (!passwordCodeData.codeId) {
      alert.warning('请先获取验证码');
      return;
    }

    setIsLoading(true);
    try {
      const data = new FormData();
      data.append('new_password', passwordData.new_password);
      data.append('code', verifyCode);
      data.append('code_id', passwordCodeData.codeId);

      const response = await userApi.updatePassword(data);
      if (response.code === 200) {
        const updatedUser = response.user || response.data?.user;
        if (updatedUser) {
          dispatch(sukinOsActions.setUserInfo(updatedUser));
        }
        alert.success('密码更新成功！');
        resetPasswordState();
      } else {
        alert.failure(`修改失败: ${response.msg}`);
      }
    } catch (error) {
      console.error('修改密码异常:', error);
      alert.failure('修改密码失败');
    } finally {
      setIsLoading(false);
    }
  };

  const renderAvatar = () => {
    if (avatarPreview && avatarPreview !== DEFAULT_USER_AVATOR_URL) {
      return <img src={avatarPreview} alt="用户头像" className={style[bem.e('avatar-img')]} />;
    }
    const firstChar = userInfo.username ? userInfo.username.charAt(0).toUpperCase() : 'U';
    const avatarBgColor = userInfo.id ? `#${((userInfo.id * 1234567) % 0xFFFFFF).toString(16).padStart(6, '0')}` : '#CCCCCC';
    return <div className={style[bem.e('avatar-img')]} style={{backgroundColor: avatarBgColor}}>{firstChar}</div>;
  };

  return (
    <div className={style[bem.b()]}>

      <div className={style[bem.e('section')]}>
        <div className={style[bem.e('section-title')]}><PersonOutlineIcon style={{ fontSize: 18, marginRight: 8 }} /> 个人资料</div>
        <div className={style[bem.e('card')]}>

          <div className={style[bem.e('profile-top')]}>
            <div className={style[bem.e('avatar-container')]}>
              {renderAvatar()}
              {isEditing && (
                <button
                  className={style[bem.e('avatar-edit-btn')]}
                  onClick={() => fileInputRef.current.click()}
                  disabled={isLoading}
                >
                  <EditIcon style={{ fontSize: 14 }} />
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleAvatarFileChange}
                disabled={!isEditing || isLoading}
              />
            </div>

            <div className={style[bem.e('info')]}>
              {!isEditing ? (
                <>
                  <strong className={style[bem.e('name')]}>{userInfo.username || '未设置用户名'}</strong>
                  <p className={style[bem.e('description')]}>{userInfo.email || '未绑定邮箱'}</p>
                  <div className={style[bem.e('tags')]}>
                    <span className={style[bem.e('tag')]}>{userInfo.permission?.role === 'root' ? '系统管理员' : '普通用户'}</span>
                  </div>
                </>
              ) : (
                <div className={style[bem.e('form-grid')]}>
                  <div className={style[bem.e('input-group')]}>
                    <label>用户名</label>
                    <input type="text" name="username" value={formData.username} onChange={handleChange} className={style[bem.e('input')]} disabled={isLoading} />
                  </div>
                  <div className={style[bem.e('input-group')]}>
                    <label>邮箱</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className={style[bem.e('input')]} disabled={isLoading} />
                  </div>
                </div>
              )}
            </div>

            {!isEditing && (
              <button className={style[bem.e('btn')]} onClick={() => setIsEditing(true)}>
                <EditIcon style={{ fontSize: 16 }} />
                <span>编辑资料</span>
              </button>
            )}
          </div>

          {isEditing && (
            <>
              <div className={style[bem.e('divider')]}></div>
              <div className={style[bem.e('form-grid')]}>
                <div className={style[bem.e('inline-fields')]}>
                  <div className={style[bem.e('input-group')]}>
                    <label>年龄</label>
                    <input type="number" name="age" value={formData.age} onChange={handleChange} className={style[bem.e('input')]} disabled={isLoading} />
                  </div>
                  <div className={style[bem.e('input-group')]}>
                    <label>真实姓名</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className={style[bem.e('input')]} disabled={isLoading} />
                  </div>
                  <div className={style[bem.e('input-group')]}>
                    <label>性别</label>
                    <select name="sex" value={formData.sex} onChange={handleChange} className={style[bem.e('select')]} disabled={isLoading}>
                      <option value="">请选择</option>
                      <option value="M">男</option>
                      <option value="F">女</option>
                      <option value="X">其他</option>
                    </select>
                  </div>
                </div>
                <div className={style[bem.e('inline-fields')]}>
                   <div className={style[bem.e('input-group')]}>
                      <label>手机号码</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={style[bem.e('input')]} disabled={isLoading} />
                   </div>
                   <div className={style[bem.e('input-group')]}>
                      <label>联系地址</label>
                      <input type="text" name="address" value={formData.address} onChange={handleChange} className={style[bem.e('input')]} disabled={isLoading} />
                   </div>
                </div>

                <div className={style[bem.e('action-buttons')]}>
                  <button className={style[bem.e('btn-text')]} onClick={handleCancelClick} disabled={isLoading}>取消</button>
                  <button className={`${style[bem.e('btn')]} ${style[bem.is('primary', true)]}`} onClick={handleSaveProfile} disabled={isLoading}>
                    {isLoading ? '保存中...' : '保存修改'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={style[bem.e('section')]}>
        <div className={style[bem.e('section-title')]}><SecurityIcon style={{ fontSize: 18, marginRight: 8 }} /> 安全设置</div>
        <div className={style[bem.e('card')]}>
          <div className={style[bem.e('profile-top')]}>
            <div className={style[bem.e('info')]}>
              <strong className={style[bem.e('label-bold')]}>账户密码</strong>
              {/* <p className={style[bem.e('description')]}>通过验证码验证身份后，设置新密码。无需输入旧密码。</p> */}
            </div>
            {passwordStep === 0 && (
              <button
                className={style[bem.e('btn')]}
                onClick={() => handleSendCode('updatePassword')}
                disabled={passwordCountdown > 0}
              >
                <span>{passwordCountdown > 0 ? `重新发送(${passwordCountdown}s)` : '修改密码'}</span>
              </button>
            )}
          </div>

          {passwordStep === 1 && (
             <>
              <div className={style[bem.e('divider')]}></div>
              <div className={style[bem.e('password-form')]}>
                <div className={style[bem.e('input-group')]}>
                  <label>设置新密码</label>
                  <div className={style[bem.e('password-input-wrapper')]}>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      name="new_password"
                      value={passwordData.new_password}
                      onChange={handlePasswordChange}
                      className={style[bem.e('input')]}
                      placeholder="请输入新密码"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className={style[bem.e('password-toggle')]}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <VisibilityIcon style={{ fontSize: 18 }} /> : <VisibilityOffIcon style={{ fontSize: 18 }} />}
                    </button>
                  </div>
                </div>

                <div className={style[bem.e('input-group')]}>
                  <label>确认新密码</label>
                  <div className={style[bem.e('password-input-wrapper')]}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirm_password"
                      value={passwordData.confirm_password}
                      onChange={handlePasswordChange}
                      className={style[bem.e('input')]}
                      placeholder="请再次输入新密码"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className={style[bem.e('password-toggle')]}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <VisibilityIcon style={{ fontSize: 18 }} /> : <VisibilityOffIcon style={{ fontSize: 18 }} />}
                    </button>
                  </div>
                </div>

                <div className={style[bem.e('input-group')]}>
                  <label>身份验证码</label>
                  <div className={style[bem.e('code-wrapper')]}>
                    <input
                      type="text"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value)}
                      className={style[bem.e('input')]}
                      placeholder="邮件/手机验证码"
                      disabled={isLoading}
                    />
                    <button
                      className={style[bem.e('btn-secondary')]}
                      onClick={() => handleSendCode('updatePassword')}
                      disabled={passwordCountdown > 0 || isLoading}
                    >
                      {passwordCountdown > 0 ? `${passwordCountdown}s` : <SendIcon style={{ fontSize: 16 }}/>}
                    </button>
                  </div>
                </div>

                <div className={style[bem.e('action-buttons')]}>
                  <button className={style[bem.e('btn-text')]} onClick={resetPasswordState} disabled={isLoading}>取消</button>
                  <button className={`${style[bem.e('btn')]} ${style[bem.is('primary', true)]}`} onClick={handleSavePassword} disabled={isLoading}>
                    <SaveIcon style={{ fontSize: 16 }} /> {isLoading ? '提交中...' : '确认修改'}
                  </button>
                </div>
              </div>
             </>
          )}

        </div>
      </div>

      {/* 账户登出操作区域 */}
      <div className={style[bem.e('section')]}>
        <div className={style[bem.e('section-title')]}><ExitToAppIcon style={{ fontSize: 18, marginRight: 8 }} /> 账户操作</div>
        <div className={style[bem.e('card')]}>
          <div className={style[bem.e('profile-top')]}>
            <div className={style[bem.e('info')]}>
              <strong className={style[bem.e('label-bold')]}>退出登录</strong>
              <p className={style[bem.e('description')]}>安全退出当前设备上的系统账户。</p>
            </div>
            <button
              className={style[bem.e('btn')]}
              onClick={logout}
              style={{ color: '#d32f2f', borderColor: '#d32f2f' }}
            >
              <ExitToAppIcon style={{ fontSize: 16 }} />
              <span>退出账号</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default UserSettings;
