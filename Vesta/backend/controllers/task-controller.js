const { addDays } = require("date-fns");
const { prisma } = require("../prisma/prisma-client");
const { validate: isValidUUID } = require("uuid");
const { getFullName, formatName } = require("../services/full-name");
const mailer = require("../services/nodemailer");
const Docxtemplater = require("docxtemplater");
const PizZip = require("pizzip");
const fs = require("fs").promises;
const path = require("path");
const libre = require("libreoffice-convert");
libre.convertAsync = require("util").promisify(libre.convert);
const { convertDocxToPdf } = require("../services/converter");
const os = require("os");
const wsService = require("../services/ws-service");
const { freezeDeviceData } = require("../services/freeze-device-data");

const TaskController = {
  // Создавать может работник ППКС
  createTask: async (req, res) => {
    const {
      task_number,
      device_name,
      serial_number,
      inventory_number,
      device_type,
      device_brand,
      address,
      user_name,
      user_phone,
      MOL_name,
      MOL_phone,
      company,
      description,
      commentary,
    } = req.body;

    const createdBy = req.user.userId;

    // Далее можно проводить проверку обязательных полей и прочую обработку
    if (!task_number || !description) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    try {
      const existingTask = await prisma.tasks.findUnique({
        where: { task_number },
      });
      if (existingTask) {
        return res
          .status(409)
          .json({ error: "Запись по указанной заявке уже существует" });
      }

      const [device, task] = await prisma.$transaction(async (tx) => {
        const device = await tx.devices.upsert({
          where: { device_name },
          update: {
            device_brand,
            serial_number,
            inventory_number,
            user_name,
            user_phone,
            MOL_name,
            MOL_phone,
            company,
            addresses: {
              connectOrCreate: {
                where: { name: address },
                create: { name: address },
              },
            },
            device_types: {
              connectOrCreate: {
                where: { name: device_type },
                create: { name: device_type },
              },
            },
          },
          create: {
            device_name,
            device_brand,
            serial_number,
            inventory_number,
            user_name,
            user_phone,
            MOL_name,
            MOL_phone,
            company,
            addresses: {
              connectOrCreate: {
                where: { name: address },
                create: { name: address },
              },
            },
            device_types: {
              connectOrCreate: {
                where: { name: device_type },
                create: { name: device_type },
              },
            },
          },
        });

        const task = await tx.tasks.create({
          data: {
            task_number,
            description,
            commentary,
            statuses: {
              connect: { id: 1 },
            },
            creator: {
              connect: { id: createdBy },
            },
            devices: {
              connect: { id: device.id },
            },
          },
        });

        return [device, task];
      });

      res.status(201).json({ id: task.id });
    } catch (error) {
      console.log("Ошибка создания записи", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },
  // Просмотр данных по конкретной заявке, если пользователь создал заявку или если она находится в общем пуле СЦ
  getTaskById: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!isValidUUID(id)) {
      return res.status(404).json({ error: "Запись не найдена" });
    }

    try {
      // 1) достаём локальную задачу и связи
      const taskData = await prisma.tasks.findUnique({
        where: { id },
        include: {
          statuses: true,
          repair_conclusion: true,
          devices: {
            include: {
              device_types: true,
              addresses: true,
            },
          },
        },
      });

      const baseUrl = `${req.protocol}://${req.get("host")}`;

      let conclusion = null;
      if (taskData.repair_conclusion) {
        conclusion = {
          text: taskData.repair_conclusion.text,
          url: taskData.repair_conclusion.url_doc
            ? baseUrl + taskData.repair_conclusion.url_doc
            : null,
        };
      }

      // проверяем права и существование
      if (!taskData) {
        return res.status(404).json({ error: "Запись не найдена" });
      }

      // собираем ответный объект
      const base = {
        id: taskData.id,
        task_number: taskData.task_number,
        date_out: taskData.date_out,
        date_in: taskData.date_in,

        closedAt: userRole === "ППКС" ? taskData.closedAt : taskData.repairedAt,

        user_name:
          taskData.status_id === 6
            ? taskData.frozen_data.user_name
            : taskData.devices.user_name,
        user_phone:
          taskData.status_id === 6
            ? taskData.frozen_data.user_phone
            : taskData.devices.user_phone,

        MOL_name:
          taskData.status_id === 6
            ? taskData.frozen_data.MOL_name
            : taskData.devices.MOL_name,
        MOL_phone:
          taskData.status_id === 6
            ? taskData.frozen_data.MOL_phone
            : taskData.devices.MOL_phone,

        company:
          taskData.status_id === 6
            ? taskData.frozen_data.company
            : taskData.devices.company,

        device_full_name:
          taskData.status_id === 6
            ? taskData.frozen_data.device_name
            : taskData.devices.device_name,
        serial_number:
          taskData.status_id === 6
            ? taskData.frozen_data.serial_number
            : taskData.devices.serial_number,
        inventory_number:
          taskData.status_id === 6
            ? taskData.frozen_data.inventory_number
            : taskData.devices.inventory_number,

        address:
          taskData.status_id === 6
            ? taskData.frozen_data.addresses.name
            : taskData.devices.addresses.name,
        device_type:
          taskData.status_id === 6
            ? taskData.frozen_data.device_types.name
            : taskData.devices.device_types.name,

        description: taskData.description,
        commentary: taskData.commentary,
        statuses: taskData.statuses,

        repair_conclusion: conclusion,
      };

      // 4) фильтруем по правам: если ППКС — возвращаем всё, если СЦ — без date_*/commentary
      if (taskData.createdById === userId) {
        return res.json(base);
      }

      if (userRole === "Сервисный центр") {
        // удаляем недоступные СЦ поля
        const { date_in, date_out, commentary, ...scOnly } = base;
        return res.json(scOnly);
      }

      return res.status(403).json({ error: "Нет доступа к данной заявке" });
    } catch (error) {
      console.error("Ошибка получения заявки:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  },
  // Получение всех заявок
  getAllTasks: async (req, res) => {
    const {
      task_number,
      device_name,
      device_type_id,
      address_id,
      status_id,
      status_ids,
      page = 1,
      pageSize = 50,
      takeaway,
    } = req.query;
    const userRole = req.user.role;

    try {
      const pageNum = Math.max(parseInt(page, 10), 1);
      const pageSizeNum = Math.max(parseInt(pageSize, 10), 1);

      const whereClause = {};

      if (takeaway === "true") {
        whereClause.status_id = { in: [1, 2] };
      }
      // иначе, если пришёл явный массив status_ids
      else if (status_ids) {
        const arr = String(status_ids)
          .split(",")
          .map((s) => parseInt(s, 10))
          .filter((n) => !isNaN(n));
        if (arr.length) {
          whereClause.status_id = { in: arr };
        }
      }
      // иначе, если пришёл одиночный status_id
      else if (status_id) {
        const sid = parseInt(status_id, 10);
        // ваша старая логика для сервисного центра
        if (userRole === "Сервисный центр" && [1, 5].includes(sid)) {
          whereClause.status_id = { notIn: [1, 5] };
        } else {
          whereClause.status_id = sid;
        }
      }

      if (task_number) {
        whereClause.task_number = {
          contains: String(task_number),
          mode: "insensitive",
        };
      }

      if (userRole === "Сервисный центр" && !status_id) {
        whereClause.status_id = { notIn: [1, 4, 5] };
      }

      if (userRole === "ППКС") {
        whereClause.createdById = req.user.userId;
      }

      if (status_id) {
        if (
          userRole === "Сервисный центр" &&
          [1, 5].includes(parseInt(status_id, 10))
        ) {
          whereClause.status_id = { notIn: [1, 5] };
        } else {
          whereClause.status_id = parseInt(status_id, 10);
        }
      }

      if (device_name) {
        whereClause.devices.device_name = {
          contains: String(device_name),
          mode: "insensitive",
        };
      }

      if (device_type_id) {
        whereClause.devices.device_type_id = parseInt(device_type_id, 10);
      }

      if (address_id) {
        whereClause.devices.address_id = parseInt(address_id, 10);
      }

      const tasks = await prisma.tasks.findMany({
        where: {
          AND: [whereClause, { status_id: { not: 6 } }],
        },
        select: {
          id: true,
          task_number: true,
          createdAt: true,
          statuses: { select: { id: true, name: true } },
          devices: {
            select: {
              device_name: true,
              device_types: { select: { name: true } },
              addresses: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
      });

      const result = tasks.map((t) => ({
        id: t.id,
        task_number: t.task_number,
        createdAt: t.createdAt,
        statuses: {
          id: t.statuses.id,
          name: t.statuses.name,
        },
        device_name: t.devices.device_name,
        device_type: t.devices.device_types.name,
        address: t.devices.addresses.name,
      }));

      const totalCount = await prisma.tasks.count({
        where: {
          AND: [whereClause, { status_id: { not: 6 } }],
        },
      });

      res.status(200).json({
        items: result,
        total: totalCount,
        page: pageNum,
        pageSize: pageSizeNum,
      });
    } catch (error) {
      console.log("Ошибка просмотра записей", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },
  // Выдаёт закрытые заявки. У СЦ это статусы 4-6, у ППКС только 6
  getClosedTasks: async (req, res) => {
    const {
      task_number,
      device_name,
      device_type_id,
      address_id,
      closedAtDown,
      closedAtUp,
      page = 1,
      pageSize = 50,
    } = req.query;
    const userRole = req.user.role;

    try {
      const pageNum = Math.max(parseInt(page, 10), 1);
      const pageSizeNum = Math.max(parseInt(pageSize, 10), 1);

      const whereClause = {};

      if (userRole === "ППКС") {
        whereClause.status_id = 6;
        whereClause.createdById = req.user.userId;
      } else {
        whereClause.status_id = { in: [4, 5, 6] };
      }

      if (closedAtDown || closedAtUp) {
        if (userRole === "ППКС") {
          whereClause.closedAt = {};
          if (closedAtDown) {
            whereClause.closedAt.gte = new Date(closedAtDown);
          }
          if (closedAtUp) {
            const tomorrow = addDays(new Date(closedAtUp), 1);
            whereClause.closedAt.lt = tomorrow;
          }
        } else {
          whereClause.repairedAt = {};
          if (closedAtDown) {
            whereClause.repairedAt.gte = new Date(closedAtDown);
          }
          if (closedAtUp) {
            const tomorrow = addDays(new Date(closedAtUp), 1);
            whereClause.repairedAt.lt = tomorrow;
          }
        }
      }

      if (task_number) {
        whereClause.task_number = {
          contains: String(task_number),
          mode: "insensitive",
        };
      }

      if (device_name) {
        whereClause.frozen_data = {
          // путь в JSON до нужного ключа
          path: ["device_name"],
          // ищем подстроку в значении
          string_contains: String(device_name),
          string_mode: "insensitive",
        };
      }

      if (device_type_id) {
        whereClause.frozen_data = {
          path: ["device_type_id"],
          // сравниваем числовое значение
          equals: parseInt(device_type_id, 10),
        };
      }

      if (address_id) {
        whereClause.frozen_data = {
          path: ["address_id"],
          equals: parseInt(address_id, 10),
        };
      }

      const tasks = await prisma.tasks.findMany({
        where: whereClause,
        select: {
          id: true,
          task_number: true,
          createdAt: true,
          closedAt: true,
          repairedAt: true,
          frozen_data: true,
        },
        orderBy: { closedAt: "desc" },
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
      });

      const result = tasks.map((t) => ({
        id: t.id,
        task_number: t.task_number,
        createdAt: t.createdAt,
        device_name: t.frozen_data.device_name,
        device_type: t.frozen_data.device_types.name,
        address: t.frozen_data.addresses.name,
        closedAt: userRole === "ППКС" ? t.closedAt : t.repairedAt,
      }));

      const totalCount = await prisma.tasks.count({ where: whereClause });

      res.status(200).json({
        items: result,
        total: totalCount,
        page: pageNum,
        pageSize: pageSizeNum,
      });
    } catch (error) {
      console.log("Ошибка просмотра истории записей: ", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },
  // Удалять заявки могут работники ППКС
  deleteTask: async (req, res) => {
    const { id } = req.params;
    const task = await prisma.tasks.findUnique({ where: { id } });
    if (!task) {
      return res.status(404).json({ error: "Запись не найдена" });
    }

    if (task.createdById !== req.user.userId) {
      return res.status(403).json({ error: "Ошибка доступа" });
    }

    try {
      // Удаляем запись по id
      const deletedTask = await prisma.tasks.delete({
        where: { id },
      });
      // Возвращаем подтверждение об успешном удалении (можно вернуть удалённую запись или просто сообщение)
      res.json({ message: "Запись удалена" });
    } catch (error) {
      console.error("Ошибка получения заявки:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },
  // Изменять всю заявку могут работники ППКС, только статус работники СЦ
  updateTask: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const fields = req.body;

    if (!isValidUUID(id)) {
      return res.status(404).json({ error: "Запись не найдена." });
    }

    // Получаем текущую запись и связи
    const task = await prisma.tasks.findUnique({
      where: { id },
      include: {
        statuses: { select: { id: true, name: true } },
        creator: {
          select: { email: true, name: true, surname: true, patronymic: true },
        },
        devices: {
          include: {
            device_types: { select: { name: true } },
            addresses: true,
          },
        },
      },
    });

    if (
      !task ||
      (userRole === "Сервисный центр" && [1, 5].includes(task.status_id))
    ) {
      return res.status(404).json({ error: "Запись не найдена." });
    }

    try {
      const updateData = {};

      // Изменение комментария — только ППКС
      if (userRole === "ППКС" && fields.commentary !== undefined) {
        updateData.commentary = fields.commentary;
      }

      // Смена статуса
      if (fields.status_id !== undefined) {
        const newStatus = parseInt(fields.status_id, 10);
        const currStatus = task.status_id;

        if (newStatus !== currStatus) {
          // ППКС не может ставить 3 и 4
          if (userRole === "ППКС" && [3, 4].includes(newStatus)) {
            return res
              .status(403)
              .json({ error: "У вас нет прав для установки данного статуса." });
          }
          // СЦ может менять только на 3 или 4
          if (userRole === "Сервисный центр" && ![3, 4].includes(newStatus)) {
            return res
              .status(403)
              .json({ error: "У вас нет прав для установки данного статуса." });
          }

          // Применяем статус и авто-даты
          updateData.status_id = newStatus;
          if (newStatus === 2) updateData.date_out = new Date();
          if (newStatus === 4) updateData.repairedAt = new Date();
          if (newStatus === 5) updateData.date_in = new Date();
          if (newStatus === 6) {
            updateData.closedAt = new Date();
          }
        }
      }

      // Сервисный центр не может менять ничего кроме статуса
      if (userRole === "Сервисный центр") {
        const forbidden = Object.keys(fields).filter((k) => k !== "status_id");
        if (forbidden.length) {
          return res.status(403).json({
            error: "Недостаточно прав для изменения полей кроме статуса.",
          });
        }
      }

      // Сохраняем изменения
      const updated = await prisma.tasks.update({
        where: { id },
        data: updateData,
        include: {
          statuses: { select: { id: true, name: true } },
          devices: {
            include: {
              device_types: { select: { name: true } },
              addresses: true,
            },
          },
        },
      });

      if (updateData.status_id === 4) {
        mailer({
          to: task.creator.email,
          subject: `Заявка ${task.task_number} | Ремонт завершён`,
          text: `
            Уважаемый ${getFullName(task.creator)},

            Ремонт по заявке ${task.task_number} завершён.

            Конфигурационная единица: ${task.devices.device_name}
            Тип устройства: ${task.devices.device_types.name}

            Вы можете забрать устройство по адресу.

            С уважением
            Сервисный центр по ремонту
          `,
          html: `
            <!DOCTYPE html>
            <html lang="ru">
            <head>
              <meta charset="UTF-8">
              <title>Ремонт завершён</title>
            </head>
            <body style="font-family: Arial, sans-serif; font-size: 14px; color: #000;">
              <p style="margin:0 0 4px;">
                Уважаемый ${getFullName(task.creator)},
              </p>
              <p style="margin:0 0 12px;">
                Ремонт по заявке <strong>${task.task_number}</strong> завершён.
              </p>
              <p style="margin:0 0 4px;">
                <strong>Конфигурационная единица:</strong> ${
                  task.devices.device_name
                }
              </p>
              <p style="margin:0 0 12px;">
                <strong>Тип устройства:</strong> ${
                  task.devices.device_types.name
                }
              </p>
              <p style="margin:0 0 20px;">
                Вы можете забрать устройство по адресу.
              </p>
              <p style="margin:0 0 5px;">С уважением</p>
              <p style="margin:0 0 20px;"><strong>Сервисный центр по ремонту</strong></p>
              <p style="margin:0 0 20px;">
                <img src="cid:logo@NNSputnik" alt="Логотип" style="max-width:200px;">
              </p>
            </body>
            </html>
          `,
          attachments: [
            {
              filename: "logo.png",
              path: path.join(__dirname, "../assets", "logo.png"),
              cid: "logo@NNSputnik",
            },
          ],
        });
      }

      const base = {
        id: updated.id,
        task_number: updated.task_number,
        date_out: updated.date_out,
        date_in: updated.date_in,

        user_name: updated.devices.user_name,
        user_phone: updated.devices.user_phone,

        MOL_name: updated.devices.MOL_name,
        MOL_phone: updated.devices.MOL_phone,

        company: updated.devices.company,

        device_full_name: updated.devices.device_name,
        serial_number: updated.devices.serial_number,
        inventory_number: updated.devices.inventory_number,

        address: updated.devices.addresses.name,
        device_type: updated.devices.device_types.name,

        description: updated.description,
        commentary: updated.commentary,
        statuses: updated.statuses,
      };

      const wsPayload = {
        id: updated.id,
        creatorId: updated.createdById,
      };

      // Отправляем WS-сообщение всем клиентам
      wsService.broadcast(
        JSON.stringify({
          type: "TASK_UPDATED",
          payload: wsPayload,
        })
      );

      if ([4, 6].includes(updated.status_id)) {
        await freezeDeviceData(id);
      }

      if (updated.createdById === userId) {
        return res.json(base);
      }

      if (userRole === "Сервисный центр") {
        const { date_in, date_out, commentary, ...scOnly } = base;
        return res.json(scOnly);
      }

      return res.status(403).json({ error: "Нет доступа к данной заявке" });
    } catch (err) {
      console.error("Ошибка обновления заявки:", err);
      return res.status(500).json({ error: "Внутренняя ошибка сервера." });
    }
  },
  // Загрузка заключения по ремонту
  uploadConclusion: async (req, res) => {
    const { text } = req.body;
    const { task_id } = req.params;
    const file = req.file;

    if (!task_id) {
      return res.status(400).json({ error: "Не получен id заявки" });
    }
    if (!isValidUUID(task_id)) {
      return res.status(400).json({ error: "Некорректный формат id заявки" });
    }

    if (!text && !file) {
      return res.status(400).json({
        error: "Нужно предоставить текст заключения или загрузить его скан",
      });
    }

    try {
      const findTask = await prisma.tasks.findUnique({
        where: { id: task_id },
        include: { repair_conclusion: true },
      });

      if (!findTask) {
        return res.status(404).json({ error: "Заявка не найдена." });
      }

      if (findTask.repair_conclusion) {
        return res
          .status(409)
          .json({ message: "Заключение по ремонту уже существует." });
      }

      const createData = {};
      if (text) {
        createData.text = text;
      }
      let publicUrl;
      if (file) {
        // Определяем расширение из оригинального имени
        const ext = path.extname(file.originalname).toLowerCase(); // .pdf, .jpg, .png и т.п.
        // Новое имя: "Заключение по заявке № 123.pdf"
        const newFilename = `Заключение по заявке № ${findTask.task_number}${ext}`;
        const uploadDir = path.dirname(file.path); // папка uploads
        const newPath = path.join(uploadDir, newFilename);

        // Переименовываем файл на диске
        await fs.rename(file.path, newPath);

        // Публичный URL
        publicUrl = `/uploads/${encodeURIComponent(newFilename)}`;

        createData.url_doc = publicUrl;
      }

      const updatedTask = await prisma.tasks.update({
        where: { id: task_id },
        data: {
          repair_conclusion: {
            create: createData,
          },
        },
        include: {
          repair_conclusion: true,
        },
      });

      return res.status(201).json(updatedTask);
    } catch (error) {
      console.error("Ошибка загрузки заключения: ", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  },
  // Скачивание заключения по ремонту
  downloadConclusion: async (req, res) => {
    const { task_id } = req.params;

    try {
      const rec = await prisma.repair_conclusions.findUnique({
        where: { task_id },
      });

      if (!rec || !rec.url_doc) return res.status(404).end();
      // путь на диске, например:
      const filename = decodeURIComponent(rec.url_doc.split("/").pop());
      const filePath = path.join(__dirname, "..", "uploads", filename);

      res.download(filePath, filename);
    } catch (error) {
      console.error("Ошибка скачивания заключения: ", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  },
  // Генерация акта на ремонт
  actPrinting: async (req, res) => {
    const { id } = req.params;

    try {
      const task = await prisma.tasks.findUnique({
        where: { id },
        select: {
          task_number: true,
          devices: {
            select: {
              device_name: true,
              inventory_number: true,
              serial_number: true,
              company: true,
              addresses: {
                select: {
                  name: true,
                },
              },
              user_name: true,
              user_phone: true,
            },
          },
          description: true,
          creator: {
            select: {
              name: true,
              surname: true,
              patronymic: true,
              job_titles: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!task) return res.status(404).json({ error: "Заявка не найдена." });

      const full_name = getFullName(task.creator);

      const content = await fs.readFile("./assets/templateNA.docx", "binary");
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      const modelName = task.devices.device_name.includes(" - ")
        ? task.devices.device_name.split(" - ")[1].trim()
        : task.devices.device_name;

      doc.render({
        model: modelName,
        inv: task.devices.inventory_number,
        serial: task.devices.serial_number,
        description: task.description,
        company: task.devices.company,
        userName: formatName(task.devices.user_name),
        address: task.devices.addresses.name,
        userPhone: task.devices.user_phone || "",
        jobTitle: task.creator.job_titles.name,
        fullName: formatName(full_name),
      });

      const docxBuf = doc.getZip().generate({ type: "nodebuffer" });
      // определяем путь для выходного PDF
      const outputPdfPath = path.join(
        os.tmpdir(),
        `act_${task.task_number}.pdf`
      );

      // конвертируем через ваш новый helper
      const pdfBuf = await convertDocxToPdf(docxBuf, outputPdfPath);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="act_${task.task_number}.pdf"`
      );
      return res.send(pdfBuf);
    } catch (error) {
      console.error("Ошибка создания акта: ", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  },
  // Генерация согласования на вынос
  takeawayPrinting: async (req, res) => {
    const { ids } = req.body;

    const createdBy = req.user.userId;

    if (!Array.isArray(ids) || ids.length === 0) {
      console.log("ids:", ids);
      return res.status(400).json({ message: "Заявки не выбраны." });
    }

    try {
      const tasks = await prisma.tasks.findMany({
        where: {
          id: { in: ids },
        },
        select: {
          devices: {
            select: {
              device_brand: true,
              device_types: { select: { name: true } },
            },
          },
        },
      });

      const user = await prisma.users.findUnique({
        where: { id: createdBy },
        select: {
          name: true,
          surname: true,
          patronymic: true,
          job_titles: { select: { name: true } },
        },
      });

      const counts = new Map();
      for (const { devices } of tasks) {
        const { device_brand, device_types } = devices;
        const label = `${device_types.name} ${device_brand}`;
        counts.set(label, (counts.get(label) || 0) + 1);
      }

      const thisDevices = Array.from(counts.entries()).map(
        ([device, count], idx) => ({
          n: idx + 1,
          device,
          count,
        })
      );

      const year = new Date().toLocaleDateString("ru", { year: "2-digit" });

      const seqName = `takeaway_seq_${year}`;
      await prisma.$executeRawUnsafe(`
        CREATE SEQUENCE IF NOT EXISTS "${seqName}"
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;
      `);
      const result = await prisma.$queryRawUnsafe(`
        SELECT nextval('${seqName}') AS nextval;
      `);
      const num = result[0].nextval;

      const content = await fs.readFile("./assets/templateSA.docx", "binary");
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.render({
        num: num,
        year: year,
        jobTitle: user.job_titles.name,
        fullName: formatName(getFullName(user)),
        devices: thisDevices,
      });

      const docxBuf = doc.getZip().generate({ type: "nodebuffer" });

      const outputPdfPath = path.join(
        os.tmpdir(),
        `takeaway_${num}-${year}.pdf`
      );

      const pdfBuf = await convertDocxToPdf(docxBuf, outputPdfPath);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="takeaway_${num}-${year}.pdf"`
      );
      return res.send(pdfBuf);
    } catch (error) {
      console.error("Ошибка создания соглашения на вынос: ", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  },
};

module.exports = TaskController;
