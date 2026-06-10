import storage from 'redux-persist/lib/storage'
import sessionStorage from 'redux-persist/lib/storage/session'
import createPiniaStyleTransform from '../transform'
import userConfig from "./user"
import educationConfig from './education'
const storageMapper = {
  'session': sessionStorage,
  'local': storage // 可以扩展其他存储类型
}
const PersistProvider = (config) => {
  const {
    key,
    storage: storageType = 'session',
    blacklist = [],
    whitelist = [],
    paths = [],
    ...rest
  } = config
  const transforms = paths.length > 0 ? [createPiniaStyleTransform(paths)] : []
  const persistConfig = {
    key,
    storage: storageMapper[storageType] || storageMapper.local,
    ...rest
  }

  if (blacklist.length > 0) {
    persistConfig.blacklist = blacklist
  } else if (whitelist.length > 0) {
    persistConfig.whitelist = whitelist
  }

  if (transforms.length > 0) {
    persistConfig.transforms = transforms
  }

  return persistConfig
}

export const userPersistConfig = PersistProvider(userConfig )
export const educationPersistConfig = PersistProvider(educationConfig)
