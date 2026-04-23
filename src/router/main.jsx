import { createBrowserRouter } from "react-router-dom";
import SukinOsRouter from "./sukinos/main"
import JumpRouter from "./jump"
//这里主要考虑动态的处理路由
// 牺牲带宽,不使用懒加载
const MyStateRoutes =
  SukinOsRouter
  //这个跳转处理必须要放到最后,放置被匹配
  .concat(JumpRouter)
  .concat([])
const router = createBrowserRouter(MyStateRoutes)

export default router;

