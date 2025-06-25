const { getTaskFromSirius } = require("../services/get-from-api");

const ApiController = {
  getSiriusData: async (req, res) => {
    const { task_number } = req.params;
    try {
      const sirius_data = await getTaskFromSirius(
        `http://${process.env.SIRIUS_URL}:4000/api/sirius/${task_number}`
      );
      return res.status(200).json(sirius_data);
    } catch (error) {
      console.error("Ошибка при отправке запроса:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  },
};

module.exports = ApiController;
