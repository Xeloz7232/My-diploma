import type { Action, ThunkAction } from "@reduxjs/toolkit"
import { configureStore } from "@reduxjs/toolkit"
import auth from "../features/userSlice"
import { api } from "./services/api"
import { listenerMiddleware } from "../middleware/auth"

const savedToken = localStorage.getItem("token")

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth,
  },
  middleware: getDefaultMiddleware => {
    return getDefaultMiddleware()
      .concat(api.middleware)
      .prepend(listenerMiddleware.middleware)
  },
  devTools: process.env.NODE_ENV !== "production",
  preloadedState: {
    auth: {
      token: savedToken ?? undefined,
      isAuthenticated: Boolean(savedToken),
      profile: null,
    },
  },
})

export type AppStore = typeof store
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = AppStore["dispatch"]
export type AppThunk<ThunkReturnType = void> = ThunkAction<
  ThunkReturnType,
  RootState,
  unknown,
  Action
>
