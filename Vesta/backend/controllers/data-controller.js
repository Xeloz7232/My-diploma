const { prisma } = require("../prisma/prisma-client");
const {
  differenceInDays,
  addWeeks,
  startOfWeek,
  endOfWeek,
  min,
  max,
} = require("date-fns");

/**
 * Считает, сколько заявок «сидят» в ремонте по интервалам в 7 дней.
 * Возвращает объект { labels: string[], counts: number[] },
 * где labels = ['1 неделя', '2 недели', ...], counts — соответствующие числа.
 */
async function getDurationCounts({ userRole, userId }) {
  const countsMap = {}; // weekNumber → count
  const numbersMap = {}; // weekNumber → [task_number,…]

  // Общий фильтр по роли (если нужно)
  const baseFilters = userRole === "ППКС" ? { createdById: userId } : {};

  // Выбираем все задачи, у которых есть date_out, но ещё нет repairedAt
  const tasks = await prisma.tasks.findMany({
    where: {
      ...baseFilters,
      date_out: { not: null },
      repairedAt: null,
    },
    select: {
      date_out: true,
      task_number: true,
    },
  });

  // Группируем по «неделе пребывания»
  const now = new Date();

  tasks.forEach(({ date_out, task_number }) => {
    const days = differenceInDays(now, date_out);
    const weekNumber = Math.ceil((days + 1) / 7);

    countsMap[weekNumber] = (countsMap[weekNumber] || 0) + 1;
    numbersMap[weekNumber] = numbersMap[weekNumber] || [];
    numbersMap[weekNumber].push(task_number);
  });

  // Собираем метки и массивы, упорядоченные по номеру недели
  const maxWeek = tasks.length
    ? Math.max(...Object.keys(countsMap).map((n) => +n))
    : 0;

  const labels = [],
    counts = [],
    numbers = [];
  for (let w = 1; w <= maxWeek; w++) {
    labels.push(`${w} ${w === 1 ? "неделя" : w < 5 ? "недели" : "недель"}`);
    counts.push(countsMap[w] || 0);
    numbers.push(numbersMap[w] || []);
  }

  return { labels, counts, numbers };
}
/**
 * Делит месяц на интервалы календарных недель (понедельник–воскресенье),
 * обрезая первую и последнюю неделю по границам месяца.
 */
function splitMonthIntoRealWeeks(parsedYear, parsedMonth) {
  const monthStart = new Date(
    Date.UTC(parsedYear, parsedMonth - 1, 1, 0, 0, 0)
  );
  const monthEnd = new Date(Date.UTC(parsedYear, parsedMonth, 1, 0, 0, 0));

  // находим понедельник недели, содержащей первый день месяца
  let cursor = startOfWeek(monthStart, { weekStartsOn: 1 });

  const weeks = [];
  while (cursor < monthEnd) {
    // конец недели — воскресенье
    const weekEnd = endOfWeek(cursor, { weekStartsOn: 1 });

    // обрезаем начало и конец по границам месяца
    const start = max([cursor, monthStart]);
    const end = min([weekEnd, monthEnd]);

    weeks.push({ start, end });
    cursor = addWeeks(cursor, 1);
  }

  return weeks;
}
/**
 * Считает открытые/закрытые задачи по каждому календарному интервалу
 */
async function getWeeklyCounts({ parsedMonth, parsedYear, userRole, userId }) {
  const baseFilters = userRole === "ППКС" ? { createdById: userId } : {};

  const weeks = splitMonthIntoRealWeeks(parsedYear, parsedMonth);

  // поля для открытия и закрытия
  const openField = userRole === "ППКС" ? "createdAt" : "date_out";
  const closeField = userRole === "ППКС" ? "closedAt" : "repairedAt";
  const closeStatus = userRole === "ППКС" ? { in: [6] } : { in: [4, 5, 6] };

  // собираем промисы для каждого интервала
  const openPromises = weeks.map((w) =>
    prisma.tasks.count({
      where: {
        ...baseFilters,
        [openField]: { gte: w.start, lt: w.end },
      },
    })
  );
  const closedPromises = weeks.map((w) =>
    prisma.tasks.count({
      where: {
        ...baseFilters,
        [closeField]: { gte: w.start, lt: w.end },
        status_id: closeStatus,
      },
    })
  );

  const [openCounts, closedCounts] = await Promise.all([
    Promise.all(openPromises),
    Promise.all(closedPromises),
  ]);

  // генерируем метки вида "Mon, Apr 29 – Sun, May 5"
  const labels = weeks.map((w) => {
    const s = w.start.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
    });
    // "-1 ms", чтобы не захватить следующий день
    const e = new Date(w.end.getTime() - 1).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
    });
    return `${s}-${e}`;
  });

  return { labels, openCounts, closedCounts };
}
/**
 * Считает по статусам (за всё время, без фильтра по дате)
 */
async function getStatusCounts({ userRole, userId }) {
  const baseFilters = userRole === "ППКС" ? { createdById: userId } : {};

  const statusFilter = userRole === "ППКС" ? { not: 6 } : { in: [2, 3] };

  const statusGroups = await prisma.tasks.groupBy({
    by: ["status_id"],
    where: {
      ...baseFilters,
      status_id: statusFilter,
    },
    _count: { status_id: true },
  });

  const statuses = await prisma.statuses.findMany({
    where: { id: { in: [1, 2, 3, 4, 5] } },
  });

  const rawCounts = statuses.reduce((acc, s) => {
    const grp = statusGroups.find((g) => g.status_id === s.id);
    acc[s.id] = {
      name: s.name,
      count: grp?._count.status_id || 0,
    };
    return acc;
  }, {});

  return {
    one: rawCounts[1],
    two: rawCounts[2],
    three: rawCounts[3],
    four: rawCounts[4],
    five: rawCounts[5],
  };
}

const DataController = {
  // Получение данных для фильтров
  getData: async (req, res) => {
    try {
      const device_types = await prisma.device_types.findMany();
      const addresses = await prisma.addresses.findMany();
      const statuses = await prisma.statuses.findMany();

      return res.json({
        device_types,
        addresses,
        statuses,
      });
    } catch (error) {
      console.error("Ошибка получения справочников: ", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  },
  // Получение данных по заявке из Сириуса (типа)
  getStatistic: async (req, res) => {
    try {
      const { month, year } = req.query;
      const userRole = req.user.role;
      const userId = req.user.userId;

      const parsedMonth = parseInt(month, 10);
      const parsedYear = parseInt(year, 10);

      // получаем данные по неделям
      const { labels, openCounts, closedCounts } = await getWeeklyCounts({
        parsedMonth,
        parsedYear,
        userRole,
        userId,
      });

      // получаем статусную статистику
      const statusCounts = await getStatusCounts({ userRole, userId });

      const durationStats = await getDurationCounts({ userRole, userId });

      return res.status(200).json({
        labels, // ['2025-04-29 – 2025-05-05', …]
        open: openCounts,
        closed: closedCounts,
        statusCounts, // { one:…, two:…, … }
        duration: durationStats,
      });
    } catch (error) {
      console.error("Ошибка получения статистики:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  },
  // Карта
  addressLocation: async (req, res) => {
    try {
      const coords = await prisma.tasks.findMany({
        where: {
          createdById: req.user.userId,
          status_id: { in: [1, 4, 5] },
        },
        select: {
          task_number: true,
          devices: {
            select: {
              addresses: {
                select: {
                  name: true,
                  lat: true,
                  lon: true,
                },
              },
            },
          },
          statuses: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return res.status(200).json(coords);
    } catch (error) {
      console.error("Ошибка получения координат: ", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  },
};

module.exports = DataController;
