export const hasOwnKey = (data, target) => {
  return data ? Object.hasOwn(data, target) : false
}
export const deepHasOwnKey = (data, target) => {
  if (!data) false
  if (hasOwnKey(data, target)) true
  Object.keys(data)
}
export const hasOwnKeyByPath = (data, path) => {}
