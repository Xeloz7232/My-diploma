export interface Role {
  id: number
  name: string
}

export interface User {
  id: string
  email: string
  login: string
  name: string
  surname: string
  patronymic?: string
  roles: Role
  job_title: { id: number; name: string }
}

export interface SiriusTask {
  id: string
  task_number: string
  device_id: string
  device: Device
  MOL: SiriusUser
}

export interface Device {
  id: string
  brand_name: string
  model: string
  serial_num: string
  inventory_num: string
  user_id: string
  users: SiriusUser
  address: { id: number; name: string }
  device_type: { id: number; name: string }
}

export interface SiriusUser {
  id: string
  name: string
  surname: string
  patronymic?: string
  phone_num: string
  company: { id: number; name: string }
}

export interface TasksResponse {
  items: MiniTask[]
  total: number
  page: number
  pageSize: number
}

export interface ClosedTasksResponse {
  items: MiniTaskClosed[]
  total: number
  page: number
  pageSize: number
}

export interface MiniTask {
  id: string
  task_number: string
  createdAt: Date
  statuses: Statuses
  device_name: string
  device_type: string
  address: string
}

export interface MiniTaskClosed {
  id: string
  task_number: string
  closedAt: Date
  statuses: Statuses
  device_name: string
  device_type: string
  address: string
}

export interface TaskDetail {
  id: string
  task_number: string
  description: string

  closedAt?: Date | null

  user_name?: string | null
  user_phone?: string | null
  MOL_name?: string | null
  MOL_phone?: string | null
  company?: string | null

  device_full_name: string
  serial_number: string
  inventory_number: string
  address: string
  device_type: string

  statuses: Statuses

  date_out?: Date | null
  date_in?: Date | null
  commentary?: string

  repair_conclusion?: { text: string; url: string }
}

export interface Statuses {
  id: number
  name: string
}

export interface Coords {
  task_number: string
  devices: {
    addresses: { name: string; lat: number; lon: number }
  }
  statuses: { id: number; name: string }
}
