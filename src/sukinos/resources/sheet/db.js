import {getStore, STORES} from '@/sukinos/utils/_db'

const sheetStore = getStore(STORES.SHEET.name)

export async function getSheetState() {
  const result = await sheetStore.get('current_state')
  return result ? result.data : null
}

export async function putSheetState(stateData) {
  return sheetStore.put({id: 'current_state', data: stateData})
}
