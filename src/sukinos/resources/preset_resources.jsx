import {
  ENV_KEY_RESOURCE_ID,
  ENV_KEY_NAME,
  ENV_KEY_IS_BUNDLE,
  ENV_KEY_LOGIC,
  ENV_KEY_CONTENT,
  ENV_KEY_META_INFO
} from "@/sukinos/utils/config"

import developerRegistry from './developer/registry'
import fileSystemRegistry from './fileSystem/registry'
import notebookRegistry from './notebook/registry'
import settingRegistry from './setting/registry'
import startRegistry from './start/registry'
import storeRegistry from './store/registry'
import localDevRegistry from './localDev/registry'
import systemManageRegistry from './systemManage/registry'
import drawBoardRegistry from './drawBoard/registry'
import sheetRegistry from './sheet/registry'

const keyMapping = {
  ENV_KEY_RESOURCE_ID,
  ENV_KEY_NAME,
  ENV_KEY_IS_BUNDLE,
  ENV_KEY_LOGIC,
  ENV_KEY_CONTENT,
  ENV_KEY_META_INFO
}


const replaceKeys = (registry) =>
  Object.fromEntries(
    Object.entries(registry).map(([k, v]) => [keyMapping[k] || k, v])
  )

const rawResources = [
  developerRegistry,
  fileSystemRegistry,
  notebookRegistry,
  settingRegistry,
  startRegistry,
  storeRegistry,
  localDevRegistry,
  systemManageRegistry,
  drawBoardRegistry,
  sheetRegistry,
]

export const PRESET_RESOURCES = rawResources.map(replaceKeys)
