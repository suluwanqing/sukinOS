function _bem(prefixName, blockSuffix = '', element = '', modifier = '') {
  let className = prefixName

  if (blockSuffix) {
    className += `-${blockSuffix}`
  }

  if (element) {
    className += `__${element}`
  }

  if (modifier) {
    className += `--${modifier}`
  }

  return className
}

function createBEM(prefixName) {
  const b = (blockSuffix = '') => _bem(prefixName, blockSuffix)

  const e = (element = '') => (element ? _bem(prefixName, '', element) : '')

  const m = (modifier = '') => (modifier ? _bem(prefixName, '', '', modifier) : '')

  const be = (blockSuffix = '', element = '') =>
    blockSuffix && element ? _bem(prefixName, blockSuffix, element) : ''

  const bm = (blockSuffix = '', modifier = '') =>
    blockSuffix && modifier ? _bem(prefixName, blockSuffix, '', modifier) : ''

  const em = (element = '', modifier = '') =>
    element && modifier ? _bem(prefixName, '', element, modifier) : ''

  const bem = (blockSuffix = '', element = '', modifier = '') =>
    blockSuffix && element && modifier ? _bem(prefixName, blockSuffix, element, modifier) : ''

  const is = (name, state = false) => (state ? `is-${name}` : '')

  return {b, e, m, be, bm, em, bem, is}
}

function createNamespace(name) {
  const prefixName = `su-${name}`
  return createBEM(prefixName)
}

/**
 * createNamespace('button') 给出 'su-button' 前缀的 BEM 生成器：
 * b('primary') → su-button-primary，e('icon') → su-button__icon，m('disabled') → su-button--disabled，
 * be / bm / em 两两组合；空参数一律返回空串，所以 is('active', false) 也是空串。
 */
export {createNamespace}
