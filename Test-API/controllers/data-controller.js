const { prisma } = require("../prisma/prisma-client");

const DataController = {
  getData: async (req, res) => {
    try {
      const [device_type, address] = await Promise.all([
        prisma.device_type.findMany(),
        prisma.address.findMany(),
      ]);

      return res.json({ device_type, address });
    } catch (error) {
      console.error("Ошибка получения заявки:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },
};

module.exports = DataController;
