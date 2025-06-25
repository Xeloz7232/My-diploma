const axios = require("axios");

async function getTaskFromSirius(req) {
  try {
    const response = await axios.get(req);
    return response.data;
  } catch (error) {
    return null;
  }
}

module.exports = { getTaskFromSirius };