import { createSlice } from "@reduxjs/toolkit"
import { userApi } from "../app/services/userApi"
import { RootState } from "../app/store"
import { User } from "../app/types"

interface UserState {
  token?: string
  isAuthenticated: boolean
  profile: User | null
}

const initialState: UserState = {
  token: undefined,
  isAuthenticated: false,
  profile: null,
}

const slice = createSlice({
  name: "user",
  initialState,
  reducers: {
    // при логауте просто сбрасываем всё в initialState
    logout: () => initialState,
  },
  extraReducers: builder => {
    builder
      // 1) после успешного login сохраняем token + ставим флаг
      .addMatcher(
        userApi.endpoints.login.matchFulfilled,
        (state, { payload }) => {
          state.token = payload.token
          state.isAuthenticated = true
        },
      )
      // 2) после успешного getUserProfile сохраняем профиль
      .addMatcher(
        userApi.endpoints.getUserProfile.matchFulfilled,
        (state, { payload }) => {
          state.profile = payload
        },
      )
  },
})

export const { logout } = slice.actions
export default slice.reducer

// Селекторы:
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated

export const selectToken = (state: RootState) => state.auth.token
export const selectUserProfile = (state: RootState) => state.auth.profile
export const selectUserRoleId = (state: RootState) => state.auth.profile?.roles.id
export const selectUserRoleName = (state: RootState) => state.auth.profile?.roles.name
export const selectUserName = (state: RootState) => {
  const first = state.auth.profile?.name ?? '';
  const last  = state.auth.profile?.surname ?? '';
  return [first, last].filter(part => part !== '').join(' ');
};