const { prisma } = require("../prisma/prisma-client");

const TaskController = {
  getTask: async (req, res) => {
    const { task_number } = req.params;
    try {
      const task = await prisma.task.findUnique({
        where: { task_number },
        include: {
          device: {
            include: {
              users: {
                include: {
                  company: true,
                },
              },
              address: true,
              device_type: true,
            },
          },
          MOL: {
            include: {
              company: true,
            },
          },
        },
      });

      return res.status(200).json(task);
    } catch (error) {
      console.error("Ошибка получения заявки:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },
};

module.exports = TaskController;
