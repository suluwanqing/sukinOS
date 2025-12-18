import { createBrowserRouter } from "react-router-dom";
import AdminIndex from "@/main/layout"
import DeskBook from "@/main/deskBook/layout"
const AdminRouter = [
  {
    path: '/',
    element:<AdminIndex/>
  },
  {
    path: '/deskbook',
    element:<DeskBook/>
  },
]
const MyStateRoutes = AdminRouter
  .concat([])
const router = createBrowserRouter(MyStateRoutes)
export default router;

