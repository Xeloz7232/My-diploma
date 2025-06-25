const { prisma } = require("../prisma/prisma-client");

async function freezeDeviceData(taskId) {
  // 1) Получаем текущее состояние задачи вместе с полем devices
  const task = await prisma.tasks.findUnique({
    where: { id: taskId },
    select: {
      device_id: true,
      devices: {
        include: {
          addresses: true,
          device_types: true,
        }
      },
    },
  });

  if (!task) {
    throw new Error(`Заявка не найдена: ${taskId}`);
  }
  if (!task.device_id) {
    // нечего «замораживать»
    return;
  }

  // 2) Обновляем задачу: записываем frozen_data = все данные devices, и device_id = null
  await prisma.tasks.update({
    where: { id: taskId },
    data: {
      frozen_data: task.devices,
    },
  });
}

module.exports = { freezeDeviceData }