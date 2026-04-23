import { LazyComponent } from "@/router/routerHelper"
import { Navigate } from "react-router-dom"

const SukinOsRouter = [
  {
    path: '/',
    element: <Navigate to="/sukinos" replace />
  },
  {
    path: '/sukinos',
    element: (
      <LazyComponent
        importFunc={() => import("@/sukinos/layout")}
        requireAuth={true}
      />
    ),
    handle: {

    }
  },
  {
    path: '/sukinos/deskbook',
    element: (
      <LazyComponent
        importFunc={() => import("@/sukinos/deskbook/layout")}
        requireAuth={true}
      />
    ),
    handle: {

    }
  },
  {
    path: '*',
    element: <Navigate to="/sukinos" replace />
  }
]

export default SukinOsRouter
