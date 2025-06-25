import "./app/services/wsClient";
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { store } from "./app/store"
import "./index.css"
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import 'antd/dist/reset.css';
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { Login } from "./pages/login"
import { AuthGuard } from "./features/authGuard"
import { Tasks } from "./pages/tasks/tasks"
import { ClosedTasks } from "./pages/tasks-history/tasks-history"
import { Stats } from "./pages/statistic/stats"
import { ConfigProvider } from 'antd';
import ru_RU from 'antd/locale/ru_RU';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
dayjs.locale('ru');

const container = document.getElementById("root")

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/",
    element: <Tasks />
  },
  {
    path: "/history",
    element: <ClosedTasks />
  },
  {
    path: "/statistics",
    element: <Stats />
  },
])

if (container) {
  const root = createRoot(container)

  root.render(
    <StrictMode>
      <ConfigProvider locale={ru_RU}>
        <Provider store={store}>
          <AuthGuard>
            <RouterProvider router={router} />
          </AuthGuard>
        </Provider>
      </ConfigProvider>
    </StrictMode>,
  )
} else {
  throw new Error(
    "Root element with ID 'root' was not found in the document. Ensure there is a corresponding HTML element with the ID 'root' in your HTML file.",
  )
}
