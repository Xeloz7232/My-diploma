import { store } from "../store"
import { taskApi } from "./taskApi"

/**
 * Описание структуры сообщения от сервера WebSocket.
 */
interface TaskUpdatedMessage {
  type: "TASK_UPDATED"
  payload: {
    id: string
    creatorId: string
  }
}

/**
 * Простая реализация pub/sub для любых сообщений из WebSocket.
 * Позволяет зарегистрировать колбэк и получать все входящие сообщения.
 */
type MessageHandler = (msg: unknown) => void
const handlers: MessageHandler[] = []

/**
 * Добавляет новый обработчик. Возвращает функцию для отписки.
 */
export function subscribe(fn: MessageHandler) {
  handlers.push(fn)
  return () => {
    const idx = handlers.indexOf(fn)
    if (idx !== -1) handlers.splice(idx, 1)
  }
}

// URL вашего WebSocket-сервера. При локальной разработке обычно 'ws://localhost:3000'.
const WS_URL = "ws://localhost:3000"

// Создаём одно единственное WebSocket-соединение при загрузке этого модуля.
// Благодаря тому, что модули в JS выполняются единожды, соединение будет установлено только один раз.
const socket = new WebSocket(WS_URL)

socket.addEventListener("open", () => {
  console.log("[WS] Connected to", WS_URL)
})

socket.addEventListener("error", err => {
  console.error("[WS] Error:", err)
})

socket.addEventListener("close", () => {
  console.log("[WS] Connection closed")
})

/**
 * Обработчик входящих сообщений WebSocket.
 * Распарсивает JSON, вызывает всех подписчиков и диспатчит invalidateTags.
 */
socket.addEventListener("message", event => {
  let parsed: unknown

  try {
    parsed = JSON.parse(event.data)
  } catch (e) {
    console.error("[WS] Failed to parse message as JSON:", e)
    return
  }

  // Вызываем всех подписчиков (pub/sub)
  handlers.forEach(fn => fn(parsed))

  // Проверяем, что это нужный нам тип сообщения
  const msg = parsed as { type?: string; payload?: unknown }
  if (msg.type === "TASK_UPDATED" && msg.payload) {
    const updated = msg.payload as TaskUpdatedMessage["payload"]

    const state = store.getState()
    const currentUserProfile = state.auth.profile
    if (!currentUserProfile) {
      return
    }

    console.log(currentUserProfile.id === updated.creatorId)
    console.log(currentUserProfile.roles.id === 2)

    if (!(currentUserProfile.id === updated.creatorId || currentUserProfile.roles.id === 2))
      return

    // 1) «Протухляем» список задач — чтобы при следующем хук useGetAllTasksQuery переспросил данные:
    store.dispatch(
      taskApi.util.invalidateTags([
        { type: "Task" as const, id: "LIST" },
        { type: "Coords", id: "LIST" },
      ]),
    )

    // 2) «Протухляем» конкретную задачу с этим ID —
    //    если компонент с useGetTaskByIdQuery открыт, RTK Query переспросит этот эндпоинт.
    store.dispatch(
      taskApi.util.invalidateTags([{ type: "Task" as const, id: updated.id }]),
    )
  }
})

// Экспортируем сам WebSocket-объект на случай, если вам понадобится вручную отправить что-то на сервер.
export { socket }
