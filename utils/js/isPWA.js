const isPWA = () => {
  const pwaDisplayModes = ['fullscreen', 'standalone', 'minimal-ui']
  const isPwaDisplayMode = pwaDisplayModes.some(
    mode => window.matchMedia(`(display-mode: ${mode})`).matches
  )
  const isIOSStandalone = !!window.navigator?.standalone
  const isAndroidApp = document.referrer.includes('android-app://')
  return isPwaDisplayMode || isIOSStandalone || isAndroidApp
}
export default isPWA
