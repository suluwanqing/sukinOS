import { createSlice, createSelector } from '@reduxjs/toolkit'
import {
  SUKINOS_STORE_REMOTE_BASE,
  SUKINOS_STORE_REMOTE_TOTAL,
  SUKINOS_STORE_REMOTE_UPLOAD,
  SUKINOS_STORE_REMOTE_CHECK_UPDATES,
  SUKINOS_STORE_REMOTE_SEARCH,
  SUKINOS_STORE_REMOTE_MY_UPLOAD,
  SUKINOS_STORE_REMOTE_DELETE
} from "@/sukinos/utils/config";

/*========================================= 初始化状态 ====================================================*/
const initialState = {
  userInfo: {}, // 用户信息
  theme: '',
  ui: {},
  assistant: {
    // 动态存储验证码状态，支持多业务并发
    verificationCodes: {}
  },
  setting: { isDisplay: true },//这是是整体的体系设置
  appStore: {
    storePath: {
      baseUrl: SUKINOS_STORE_REMOTE_BASE,
      listUrl: SUKINOS_STORE_REMOTE_TOTAL,
      uploadUrl: SUKINOS_STORE_REMOTE_UPLOAD,
      checkUpdatesUrl: SUKINOS_STORE_REMOTE_CHECK_UPDATES,
      searchUrl: SUKINOS_STORE_REMOTE_SEARCH,
      myUploadUrl: SUKINOS_STORE_REMOTE_MY_UPLOAD,
      deleteUrl: SUKINOS_STORE_REMOTE_DELETE,
    },
    generateApp: {
      singleIframe: false,
      truthAllApp:false
    },
  },
  fileSystemConfig: {
      isPrivate:true
    }
}

/*============================================ 切片主体 ===============================================*/
const sukinOsSlice = createSlice({
  name: 'sukinos',
  initialState,
  reducers: {
    // 启动/更新倒计时 [动态支持任意类型]
    // payload: { type, id, seed, account, limit }
    // type: 业务类型(login, updatePassword等)
    // id: 后端返回的验证码ID (codeId)
    // seed: 前端发送的标记位
    // limit: 频率限制时长(秒)
    startVerificationCountdown: (state, action) => {
      const { type, id, seed, account, limit = 60 } = action.payload;
      if (!state.assistant.verificationCodes) {
        state.assistant.verificationCodes = {};
      }

      state.assistant.verificationCodes[type] = {
        codeId: id,      // 后端生成的唯一凭证
        seed: seed,      // 前端传入的标记 seed
        account: account,
        endTime: Date.now() + (limit * 1000), // 根据动态 limit 计算冷却结束时间
        isRunning: true
      };
    },
    // 彻底清除特定类型的验证码信息
    resetVerification: (state, action) => {
      const type = action.payload;
      if (state.assistant.verificationCodes?.[type]) {
        state.assistant.verificationCodes[type] = {
          codeId: null,
          seed: null,
          account: '',
          endTime: 0,
          isRunning: false
        };
      }
    },
    updateSeting: (state, action) => {
      const { key, value } = action.payload;
      if (!state.setting) state.setting = { isDisplay: true };
      state.setting[key] = value;
    },
    // 更新用户信息
    setUserInfo: (state, action) => {
      state.userInfo = action.payload || {};
    },
    // 设置商店路径配置
    setStorePath: (state, action) => {
      const { key, value } = action.payload;
      if (value !== null && typeof value === 'string' && value.trim() === '') {
        return;
      }
      state.appStore.storePath[key] = value;
    },
    // 恢复默认商店路径配置
    resetStorePath: (state, action) => {
        const key = action.payload; // 如果传 key 则重置单个，否则重置所有
        if (key) {
             state.appStore.storePath[key] = initialState.appStore.storePath[key];
        } else {
            Object.keys(state.appStore.storePath).forEach(k => {
                state.appStore.storePath[k] = initialState.appStore.storePath[k];
            });
        }
    },
    setFileSystemConfig: (state, action)=> {
      const { key, value } = action.payload;
      state.fileSystemConfig[key] = value;
    },
    setGenerateApp: (state,action)=>{
      const { key, value } = action.payload
      state.appStore.generateApp[key] = value;
    }
  },
})

export const sukinOsActions = sukinOsSlice.actions;
export default sukinOsSlice.reducer;

/*============================================ 选择器 (Selectors) ===============================================*/
// 基础选择器
const selectSukinOs = (store) => store?.sukinos || initialState;
export const selectorSetting = createSelector(
  [selectSukinOs],
  (sukinos) => sukinos?.setting || initialState.setting
);
export const selectorUserInfo = createSelector(
  [selectSukinOs],
  (sukinos) => sukinos?.userInfo || {}
);

export const selectorStoreSettingStorePath = createSelector(
    [selectSukinOs],
    (sukinos) => sukinos.appStore.storePath
);
export const selectGenerateApp = createSelector([selectSukinOs],
  (sukinos) => sukinos.appStore.generateApp)
export const selectFileSystemConfig = createSelector([selectSukinOs]
  , (sukinos) => sukinos.fileSystemConfig)

// 提取验证码基础状态
const selectAssistant = createSelector(
  [selectSukinOs],
  (sukinos) => sukinos?.assistant?.verificationCodes || {}
);

// 提取静态的默认对象
const defaultVerificationData = {
    codeId: null,
    seed: null,
    account: '',
    endTime: 0,
    isRunning: false
};

// 获取具体类型的验证码数据 (包含 seed 和 codeId)
export const selectVerificationData = (type) => (store) => {
  const codes = selectAssistant(store);
  return codes[type] || defaultVerificationData;
};
