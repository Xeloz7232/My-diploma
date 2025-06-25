import { JSX } from "react"
import { useGetUserProfileQuery } from "../app/services/userApi"
import MySpin from "../components/myAntd/spin"

export const AuthGuard = ({ children }: { children: JSX.Element }) => {
  const { isLoading } = useGetUserProfileQuery()

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <MySpin />
      </div>
    )
  }

  return children
}