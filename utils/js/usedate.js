import {useState, useEffect, useRef} from 'react'

const formatDate = date => {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
  return `${month}月${day}日 星期${weekday}`
}

const useDate = () => {
  const [date, setDate] = useState(new Date())
  const animationFrameId = useRef()

  useEffect(() => {
    const update = () => {
      setDate(new Date())
      animationFrameId.current = requestAnimationFrame(update)
    }

    animationFrameId.current = requestAnimationFrame(update)

    return () => cancelAnimationFrame(animationFrameId.current)
  }, [])

  const timeString = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return {
    time: timeString,
    dateString: formatDate(date),
  }
}

export default useDate
