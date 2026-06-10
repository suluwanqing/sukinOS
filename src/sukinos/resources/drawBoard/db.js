import {getStore, STORES} from '@/sukinos/utils/_db'

const boardStore = getStore(STORES.BOARDS.name)
const mindmapStore = getStore(STORES.MINDMAPS.name)

export const getBoard = boardStore.get
export const putBoard = boardStore.put
export const listBoards = boardStore.getAll
export const deleteBoard = boardStore.delete


export const getMindmap = mindmapStore.get
export const putMindmap = mindmapStore.put
export const listMindmaps = mindmapStore.getAll
export const deleteMindmap = mindmapStore.delete

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
