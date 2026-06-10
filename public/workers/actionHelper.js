import {createAsyncThunk} from '@reduxjs/toolkit'
/*========================================================数据同步========================================================*/
/*
          export const withSync = (actionCreator, defaultMeta = {}) => {
            return (...args) => {
              const action = actionCreator(...args)
              return {
                ...action,
                meta: {
                  ...action.meta,
                  sync: true,
                  timestamp: Date.now(),
                  ...defaultMeta,
                },
              }
            }
          }

          export const withoutSync = actionCreator => {
            return (...args) => {
              const action = actionCreator(...args)
              return {
                ...action,
                meta: {
                  ...action.meta,
                  sync: false, // 明确标记不同步
                  timestamp: Date.now(),
                },
              }
            }
          }
          // 之后呢在使用,dispatch的之前调用这个函数传输这个action进去即可

          */
// 方案二:推荐,使用这个在store的prepare里统一配置
export const withSync = (payload = {}, meta = {}) => ({
  payload,
  meta: {
    sync: true, // 默认同步
    timestamp: Date.now(),
    ...meta,
  },
})

// 不同步的 prepare 函数
export const withoutSync = (payload = {}, meta = {}) => ({
  payload,
  meta: {
    sync: false, // 明确不同步
    timestamp: Date.now(),
    ...meta,
  },
})
// 方案三:创建带有同步功能的切片[实际还是方案二只是这个适用于所有都需要同步的]
export const createSyncSlice = options => {
  const {name, initialState, reducers, extraReducers} = options

  const processedReducers = {}

  // 处理普通 reducers
  Object.entries(reducers || {}).forEach(([reducerName, reducerConfig]) => {
    if (typeof reducerConfig === 'function') {
      processedReducers[reducerName] = {
        reducer: reducerConfig,
        prepare: withSync,
      }
    } else {
      processedReducers[reducerName] = reducerConfig
    }
  })

  //注入同步reducer:syncState
  if (!processedReducers.syncState) {
    processedReducers.syncState = (state, action) => {
      return action.payload
    }
  }

  const wrapReducer = reducer => (state, action) => {
    return reducer(state, action)
  }
  const processedExtraReducers = builder => {
    //实际这里就是有问题的,因为这个reducer已经进来的应该在外层处理
    if (typeof extraReducers === 'function') {
      extraReducers({
        addCase: (actionCreator, reducer) => builder.addCase(actionCreator, wrapReducer(reducer)),
        addMatcher: (matcher, reducer) => builder.addMatcher(matcher, wrapReducer(reducer)),
        addDefaultCase: reducer => builder.addDefaultCase(wrapReducer(reducer)),
      })
    } else if (typeof extraReducers === 'object' && extraReducers !== null) {
      Object.keys(extraReducers).forEach(key => {
        builder.addCase(key, wrapReducer(extraReducers[key]))
      })
    }
  }
  return {
    name,
    initialState,
    reducers: processedReducers,
    extraReducers: processedExtraReducers || extraReducers,
  }
}

export const createSyncAsyncThunk = (typePrefix, payloadCreator, options = {}) => {
  return createAsyncThunk(
    typePrefix,
    async (arg, thunkAPI) => {
      let isHandledByProxy = false
      const proxyThunkAPI = {
        ...thunkAPI,
        fulfillWithValue: (value, meta) => {
          isHandledByProxy = true
          const {payload, meta: syncMeta} = withSync(value, meta)
          return thunkAPI.fulfillWithValue(payload, syncMeta)
        },
        rejectWithValue: (value, meta) => {
          isHandledByProxy = true

          const {payload, meta: syncMeta} = withSync(value, meta)
          return thunkAPI.rejectWithValue(payload, syncMeta)
        },
      }

      try {
        const result = await payloadCreator(arg, proxyThunkAPI)
        if (isHandledByProxy) {
          return result
        }
        const {meta: syncMeta} = withSync(undefined, {})
        return thunkAPI.fulfillWithValue(result, syncMeta)
      } catch (err) {
        const {payload, meta: syncMeta} = withSync(err, {isError: true})
        return thunkAPI.rejectWithValue(payload, syncMeta)
      }
    },
    {
      ...options,
      getPendingMeta: (params, storeApi) => {
        // 先获取用户可能传入的配置
        const userMeta = options.getPendingMeta ? options.getPendingMeta(params, storeApi) : {}
        return withSync(undefined, userMeta).meta
      },
    }
  )
}
/*===========================================================行为同步=============================================================*/
