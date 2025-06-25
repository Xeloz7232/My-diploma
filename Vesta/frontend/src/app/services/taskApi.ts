import { ClosedTasksResponse, TaskDetail, TasksResponse } from "../types"
import { api } from "./api"

export const taskApi = api.injectEndpoints({
  endpoints: builder => ({
    createTask: builder.mutation<
      { id: string },
      {
        task_number: string
        device_name: string
        serial_number: string
        inventory_number: string
        device_type: string
        device_brand: string
        address: string
        user_name?: string
        user_phone?: string
        MOL_name?: string
        MOL_phone?: string
        company?: string
        description: string
        commentary?: string
      }
    >({
      query: taskData => ({
        url: "/tasks",
        method: "POST",
        body: taskData,
      }),
      invalidatesTags: [
        { type: 'Task', id: 'LIST' },
        { type: 'Coords', id: 'LIST' },
      ],
    }),
    getAllTasks: builder.query<
      TasksResponse,
      {
        task_number?: string
        status_id?: number
        status_ids?: number[]
        device_id?: string
        device_name?: string
        device_type_id?: number
        address_id?: number
        page?: number
        pageSize?: number
        takeaway?: boolean
      }
    >({
      query: (filters = {}) => ({
        url: "/tasks",
        method: "GET",
        params: filters,
      }),
      providesTags: result =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: "Task" as const, id })),
              { type: "Task", id: "LIST" },
            ]
          : [{ type: "Task", id: "LIST" }],
    }),
    getTaskById: builder.query<TaskDetail, string>({
      query: id => ({
        url: `/tasks/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "Task", id }],
    }),
    deleteTask: builder.mutation<void, string>({
      query: id => ({
        url: `/tasks/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Task", id }, // чтобы сбросить detail этого id
        { type: "Task", id: "LIST" }, // чтобы обновить список
      ],
    }),
    updateTask: builder.mutation<
      TaskDetail,
      {
        id: string
        status_id?: number
        commentary?: string
      }
    >({
      query: ({ id, ...patch }) => ({
        url: `/tasks/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Task" as const, id },
        { type: "Task" as const, id: "LIST" },
      ],
    }),
    getClosedTasks: builder.query<
      ClosedTasksResponse,
      {
        task_number?: string
        device_id?: string
        device_name?: string
        device_type_id?: number
        address_id?: number
        closedAtDown?: Date
        closedAtUp?: Date
        page?: number
        pageSize?: number
      }
    >({
      query: (filters = {}) => ({
        url: "/archive",
        method: "GET",
        params: filters,
      }),
      providesTags: result =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: "Task" as const, id })),
              { type: "Task", id: "LIST" },
            ]
          : [{ type: "Task", id: "LIST" }],
    }),
    uploadConclusion: builder.mutation<
      void,
      { text?: string; file?: File; task_id: string }
    >({
      query: ({ text, file, task_id }) => {
        const formData = new FormData()
        if (text) {
          formData.append("text", text)
        }
        if (file) {
          formData.append("conclusion", file)
        }
        return {
          url: `/upload/${task_id}`,
          method: "PUT",
          body: formData,
        }
      },
      invalidatesTags: ["Task"],
    }),
    downloadConclusion: builder.query<Blob, string>({
      query: taskId => ({
        url: `/download/${taskId}`,
        method: "GET",
        responseHandler: response => response.blob(),
      }),
    }),
    actPrinting: builder.query<Blob, string>({
      query: task_id => ({
        url: `/print/${task_id}`,
        method: "GET",
        responseHandler: response => response.blob(),
      }),
    }),
    takeawayPrinting: builder.mutation<Blob, string[]>({
      query: ids => ({
        url: `/takeaway`,
        method: "POST",
        body: { ids },
        responseHandler: response => response.blob(),
      }),
    }),
  }),
})

export const {
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useGetAllTasksQuery,
  useGetTaskByIdQuery,
  useLazyGetAllTasksQuery,
  useLazyGetTaskByIdQuery,
  useUpdateTaskMutation,
  useGetClosedTasksQuery,
  useLazyGetClosedTasksQuery,
  useDownloadConclusionQuery,
  useLazyDownloadConclusionQuery,
  useUploadConclusionMutation,
  useActPrintingQuery,
  useLazyActPrintingQuery,
  useTakeawayPrintingMutation,
} = taskApi

export const {
  endpoints: {
    createTask,
    getAllTasks,
    getTaskById,
    deleteTask,
    updateTask,
    getClosedTasks,
    uploadConclusion,
    downloadConclusion,
    actPrinting,
    takeawayPrinting,
  },
} = taskApi
