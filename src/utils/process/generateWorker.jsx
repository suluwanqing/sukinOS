//生成一个可以处理逻辑的worker和内存管理
//这里尽可能减少修改,先用别名替代一下
export const generateWorker = ({
  resourceId: resId,
  name,
  isBundle,
  logic: userLogicCode,
  content,
  metaInfo
}) => {
  //但是注意目前默认只解析单文件
  //同时注入metaInfo,方便对信息处理,但这里会出现文件版本对那个被放开,无法做篡改检测。
  //这里content的处理将会导致解析问题:content必需字符串那么就要处理好避免字符串用模板导致""丢失问题,既然不能那么就只能考虑解析的时候二次处理
  const safeLogic = userLogicCode || `const initialState = {}; function reducer(s) { return s; }`;
  return `
/* 系统配置 */
const SYS_CONFIG = { resourceId: '${resId}', name: '${name}', isBundle: ${isBundle} };
const APP_METAINFO=${JSON.stringify(metaInfo)};
let _state = null;
/* 驱动 */
const broadcast = () => self.postMessage({ type: 'STATE_UPDATE', payload: { ..._state, config: SYS_CONFIG } });
const save = () => self.postMessage({ type: 'SAVE_STATE', payload: _state });
const dispatch = (action) => {
  let nextState = reducer(_state, action);
  //这个是注入整个关于内部router的操作
  if (SYS_CONFIG.isBundle && action.type === 'NAVIGATE') {
    const currentRouter = nextState.router || { path: 'home' };
    nextState = {
      ...nextState,
      router: { ...currentRouter, path: action.payload }
    };
  }

  if (nextState !== _state) {
    _state = nextState;
    broadcast();
    save();
  }
};

self.onmessage = (e) => {
  const { type, payload } = e.data;
  switch (type) {
    case 'INIT': {
      const base = typeof initialState === 'undefined' ? {} : initialState;
      if (SYS_CONFIG.isBundle && !base.router) {
        base.router = { path: 'home' };
      }
      _state = base;
      if (typeof init === 'function') {
        try {
          init(dispatch, _state);
        } catch (err) {
          // 错误处理
        }
      }
      broadcast();
      break;
    }
    case 'RESTORE': {
      _state = payload;
      broadcast();
      break;
    }
    case 'UI_ACTION':
    case 'APP_INTERACT':{
      dispatch(payload)
    }
    default:
      break;
  }
};

//注入原始组件,和resourceId作为锚点方便匹配。
const ORIGIN_COMPONENT=${JSON.stringify(content)};//resourceId:${resId};
Object.freeze(SYS_CONFIG);
Object.freeze(broadcast)
Object.freeze(save)
Object.freeze(ORIGIN_COMPONENT)
Object.freeze(dispatch)

/* 用户逻辑 */
${safeLogic}

`;
};

/**
 * 从生成的 Worker 代码中反解析出用户逻辑和配置
 */
export const parseWorkerCode = (workerCode) => {
  const result = {
    resourceId: null,
    name: null,
    isBundle: false,
    logic: null,
    initialState: null,
    content: null,
    hasReducer: false,
    hasInitFunction: false,
    originalCode: workerCode,
    metaInfo: null,
  };
  try {
    /* 1. 解析 SYS_CONFIG */
    //必须先解析 SYS_CONFIG 拿到 resourceId，才能进行后续 ORIGIN_COMPONENT 的动态匹配
    // -------------因为我们为了精确提取和存储使用了resourceId做锚点
    const sysConfigMatch = workerCode.match(/const\s+SYS_CONFIG\s*=\s*({[\s\S]*?})\s*;?\s*\n/);

    if (sysConfigMatch) {
      try {
        const sysConfigStr = sysConfigMatch[1];
        const sysConfig = new Function(`return ${sysConfigStr}`)();
        result.resourceId = sysConfig.resourceId;
        result.name = sysConfig.name;
        result.isBundle = Boolean(sysConfig.isBundle);
      } catch (e) {
        const sysConfigStr = sysConfigMatch[1];
        const resourceIdMatch = sysConfigStr.match(/resourceId:\s*'([^']*)'/);
        const nameMatch = sysConfigStr.match(/name:\s*'([^']*)'/);
        const isBundleMatch = sysConfigStr.match(/isBundle:\s*(true|false)/);

        if (resourceIdMatch) result.resourceId = resourceIdMatch[1];
        if (nameMatch) result.name = nameMatch[1];
        if (isBundleMatch) result.isBundle = isBundleMatch[1] === 'true';
      }
    }

    /* 2. 提取用户逻辑部分 */
    const userLogicMarker = '/* 用户逻辑 */';
    const userLogicStart = workerCode.indexOf(userLogicMarker);

    if (userLogicStart !== -1) {
      const userLogicCode = workerCode.substring(
        userLogicStart + userLogicMarker.length
      ).trim();

      result.logic = userLogicCode;

      // 从用户逻辑中提取 initialState
      const initialStateMatch = userLogicCode.match(/const\s+initialState\s*=\s*([^;]+)(;?)/s);
      if (initialStateMatch) {
        try {
          result.initialState = new Function(`return ${initialStateMatch[1]}`)();
        } catch (e) {
          result.initialState = initialStateMatch[1];
        }
      }

      // 检查是否有 reducer 函数
      result.hasReducer = /function\s+reducer|const\s+reducer\s*=.*=>/s.test(userLogicCode);

      // 检查是否有 init 函数
      result.hasInitFunction = /function\s+init|const\s+init\s*=.*=>/s.test(userLogicCode);
    }

    /* 3. 在整个代码中搜索 ORIGIN_COMPONENT */
    // 动态匹配逻辑：根据解析出的 resourceId 构建正则，精准定位结束位置
    let originComponentMatch = null;

    if (result.resourceId) {
        // 对 resourceId 进行转义处理，防止ID中包含正则特殊字符
        const safeId = result.resourceId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // 构建动态正则：匹配 const ORIGIN_COMPONENT = ... ;//resourceId:ID;
        // [\s\S]*? 非贪婪匹配中间的内容
        const regex = new RegExp(`const\\s+ORIGIN_COMPONENT\\s*=\\s*([\\s\\S]*?);\\/\\/resourceId:${safeId};`);
        originComponentMatch = workerCode.match(regex);
    }

    // 如果没有ID或动态匹配失败，尝试通配符回退方案 (匹配任意resourceId后缀)
    if (!originComponentMatch) {
        originComponentMatch = workerCode.match(/const\s+ORIGIN_COMPONENT\s*=\s*([\s\S]*?);\/\/resourceId:.*?;/);
    }

    if (originComponentMatch) {
      try {
        const valueStr = originComponentMatch[1].trim();
        // console.log('找到 ORIGIN_COMPONENT 原始字符串:', valueStr.substring(0, 50) + '...');

        let parsedContent = null;
        let isParsed = false;

        // 优先使用 JSON.parse
        // generateWorker 使用 JSON.stringify 生成的内容，一定是合法的 JSON 格式（或符合 JSON 标准的 JS 字面量）
        // 避免new Function 遇到换行符或特殊字符时的 SyntaxError
        try {
            parsedContent = JSON.parse(valueStr);
            isParsed = true;
        } catch (jsonErr) {
            // 只有当不是 JSON 格式时（比如用户手动改成了 JS 对象字面量），才降级使用 new Function
            // console.warn('JSON.parse 失败，尝试 new Function 执行:', jsonErr);
            try {
                parsedContent = new Function(`return ${valueStr}`)();
                isParsed = true;
            } catch (funcErr) {
                console.error('Function 解析也失败:', funcErr);
                throw funcErr;
            }
        }

        if (isParsed) {
            // 双重序列化处理
            // 如果 content 存入时本身就是一个 JSON 字符串（例如 '{"a":1}'），[这列是必需的因为生成worker时候模板会导致解析是一段字符]
            // 第一层解析后 parsedContent 会是一个字符串。
            // 这里我们需要探测它内部是否包含结构数据。
            if (typeof parsedContent === 'string') {
                try {
                    // 尝试再次解析字符串内容
                    const nestedParsed = JSON.parse(parsedContent);
                    // 只有解析出对象或数组时，才认为是有效结构并覆盖
                    // 如果是普通字符串，就保持原样
                    if (nestedParsed && typeof nestedParsed === 'object') {
                        parsedContent = nestedParsed;
                    }
                } catch (ignore) {
                    // 说明它就是一个普通字符串，不需要深层解析
                }
            }
            result.content = parsedContent;
        }

      } catch (e) {
        console.error('解析 ORIGIN_COMPONENT 失败:', e);
        // 最终兜底：如果是简单的 layout 模板字符串结构，手动提取
        const layoutMatch = originComponentMatch[1].match(/layout:\s*`([^`]*)`/s);
        if (layoutMatch) {
            result.content = { layout: layoutMatch[1] };
        } else {
            result.content = originComponentMatch[1];
        }
      }
    } else {
      console.log('未找到 ORIGIN_COMPONENT 定义');
    }

    if (result.isBundle) {
      const routerPathMatch = workerCode.match(/router:\s*\{\s*path:\s*['"]([^'"]*)['"]/);
      if (routerPathMatch) {
        result.defaultRoute = routerPathMatch[1];
      }
    }

    //解析app信息
    const AppMetaInfoMatch = workerCode.match(/const\s+APP_METAINFO\s*=\s*({[\s\S]*?});?\s*\n/);
    if (AppMetaInfoMatch) {
      try {
        const appMetaInfoStr = AppMetaInfoMatch[1];
        const appMetInfo = new Function(`return ${appMetaInfoStr}`)();
        result.metaInfo = appMetInfo
      } catch (e) {
        console.warn('解析 metaInfo 失败', e);
      }
    }
    const messageHandlers = {
      INIT: /type\s*===\s*'INIT'/.test(workerCode),
      RESTORE: /type\s*===\s*'RESTORE'/.test(workerCode),
      UI_ACTION: /type\s*===\s*'UI_ACTION'/.test(workerCode)
    };
    result.messageHandlers = messageHandlers;

  } catch (error) {
    console.error('反解析 Worker 代码失败:', error);
    result.parseError = error.message;
  }
  return result;
};
