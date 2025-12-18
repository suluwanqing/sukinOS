import { selectorUserInfo } from "@/store"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { alert } from "@/component/alert/layout"
import { useEffect } from "react"

const useAuth = () => {
  const navigate = useNavigate()
  const userInfo = useSelector(selectorUserInfo)
  const isAuthenticated = Boolean(userInfo && Object.keys(userInfo).length > 0)
  useEffect(() => {
    let timer;
    if (!isAuthenticated) {
      alert.failure("未登录") //由于目前我们的alert是全局单例,且没有处理关于多个同时,偏移。可能不显示。
      timer=setTimeout(navigate('/'),5000)
    }
    return (() => {
      window.clearTimeout(timer)
    })
  }, [isAuthenticated, navigate])

  return userInfo
}

export default useAuth
