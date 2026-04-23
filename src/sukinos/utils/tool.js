const throlle = (fn, delay = 100) => {
  let flag = true
  return function (...args) {
    if (!flag) return
    flag = false
    fn.apply(this, args)
    setTimeout(() => {
      flag = true
    }, delay)
  }
}
const debounce = (fn, delay) => {
  let timer
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}
export {throlle, debounce}
