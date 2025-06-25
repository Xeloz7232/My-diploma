import { Coords, SiriusTask } from "../types"
import { api } from "./api"

export const dataApi = api.injectEndpoints({
  endpoints: builder => ({
    getData: builder.query<
      {
        device_types: { id: number; name: string }[]
        addresses: { id: number; name: string }[]
        statuses: { id: number; name: string }[]
      },
      void
    >({
      query: () => ({
        url: "/data",
        method: "GET",
      }),
    }),
    getSiriusData: builder.query<SiriusTask, string>({
      query: task_number => ({
        url: `/getSiriusData/${task_number}`,
        method: "GET",
      }),
    }),
    getStatistic: builder.query<
      {
        labels: string[]
        open: number[]
        closed: number[]
        statusCounts: {
          one: { name: string; count: number }
          two: { name: string; count: number }
          three: { name: string; count: number }
          four: { name: string; count: number }
          five: { name: string; count: number }
        }
        duration: { counts: number[], labels: string[], numbers: string[][] }
      },
      {
        year: number
        month: number
      }
    >({
      query: ({ year, month }) => ({
        url: `/stats?year=${year}&month=${month}`,
        method: "GET",
      }),
    }),
    addressLocation: builder.query<Coords[], void>({
      query: () => ({
        url: '/coords',
        method: 'GET',
      }),
      providesTags: (result) =>
        // если данных ещё нет, всё равно помечаем списком
        result
          ? [
              ...result.map(({ task_number }) => ({ type: 'Coords' as const, id: task_number })),
              { type: 'Coords', id: 'LIST' },
            ]
          : [{ type: 'Coords', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetDataQuery,
  useLazyGetDataQuery,
  useGetSiriusDataQuery,
  useLazyGetSiriusDataQuery,
  useGetStatisticQuery,
  useLazyGetStatisticQuery,
  useAddressLocationQuery,
  useLazyAddressLocationQuery,
} = dataApi

export const {
  endpoints: { getData, getSiriusData, getStatistic, addressLocation },
} = dataApi
