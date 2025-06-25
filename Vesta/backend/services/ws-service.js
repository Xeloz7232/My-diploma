let wssInstance = null;

// Сохраняем ссылку на WebSocket.Server
function init(wss) {
  wssInstance = wss;
}

// Функция отправки всем подключённым клиентам
function broadcast(message) {
  if (!wssInstance) return;
  wssInstance.clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

// Пример: отправить всем клиентам, когда возникает какое-то событие в контроллере
module.exports = {
  init,
  broadcast,
};
