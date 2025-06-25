import { User } from "../types"
import { api } from "./api"

export const userApi = api.injectEndpoints({
  endpoints: builder => ({
    login: builder.mutation<
      { token: string },
      { login: string; password: string }
    >({
      query: userData => ({
        url: "/login",
        method: "POST",
        body: userData,
      }),
    }),
    getUserProfile: builder.query<User, void>({
      query: () => ({
        url: "/user",
        method: "GET",
      }),
      providesTags: ["UserProfile"],
    }),
    updateUser: builder.mutation<
      {
        id: string
        name?: string
        surname?: string
        patronymic?: string
      },
      {
        name?: string
        surname?: string
        patronymic?: string
        password?: string
      }
    >({
      query: userData => ({
        url: "/user",
        method: "PUT",
        body: userData,
      }),
      invalidatesTags: ["UserProfile"],
    }),
  }),
})

export const {
  useLoginMutation,
  useGetUserProfileQuery,
  useUpdateUserMutation,
  useLazyGetUserProfileQuery,
} = userApi

export const {
  endpoints: { login, getUserProfile, updateUser },
} = userApi
