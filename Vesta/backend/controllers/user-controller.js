const { prisma } = require("../prisma/prisma-client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserController = {
  register: async (req, res) => {
    const {
      role,
      email,
      login,
      password,
      name,
      surname,
      patronymic,
      job_title,
    } = req.body;

    if (
      !role ||
      !email ||
      !login ||
      !password ||
      !name ||
      !surname ||
      !job_title
    ) {
      return res.status(400).json({ error: "Поля не заполнены" });
    }

    try {
      if (role == "Сервисный центр") {
        department = "Старый город";
      }

      if (!job_title) {
        return res.status(400).json({ error: "Поля не заполнены" });
      }

      const existingUser = await prisma.users.findUnique({ where: { email } });

      if (existingUser) {
        return res.status(400).json({ error: "Пользователь уже существует" });
      }

      const foundRole = await prisma.roles.findUnique({
        where: { name: role },
      });

      if (!foundRole) {
        return res.status(400).json({ error: "Указанная роль не найдена" });
      }

      const foundJobTitle = await prisma.job_titles.findUnique({
        where: { name: job_title },
      });

      if (!foundJobTitle) {
        return res
          .status(400)
          .json({ error: "Указанная должность не найдена" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.users.create({
        data: {
          role_id: foundRole.id,
          email,
          login,
          password: hashedPassword,
          name,
          surname,
          patronymic,
          job_title_id: foundJobTitle.id,
        },
        include: {
          roles: true,
          job_titles: true,
        },
      });

      const responseUser = {
        id: user.id,
        email: user.email,
        login: user.login,
        name: user.name,
        surname: user.surname,
        patronymic: user.patronymic,
        role: user.roles,
        job_title: user.job_titles,
      };

      res.json(responseUser);
    } catch (error) {
      console.error("Ошибка регистрации", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  login: async (req, res) => {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: "Поля не заполнены" });
    }

    try {
      const user = await prisma.users.findUnique({
        where: { login },
        include: { roles: true },
      });

      if (!user) {
        return res.status(400).json({ error: "Неверный логин или пароль" });
      }

      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        return res.status(400).json({ error: "Неверный логин или пароль" });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.roles.name },
        process.env.SECRET_KEY
      );

      res.json({ token });
    } catch (error) {
      console.log("Login error", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  getUserProfile: async (req, res) => {
    const userId = req.user.userId;

    try {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        include: {
          roles: true,
          job_titles: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      const { password, ...userInfo } = user;
      res.json(userInfo);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  updateUser: async (req, res) => {
    const userId = req.user.userId;
    const { name, surname, patronymic, password } = req.body;

    try {
      // Проверяем, переданы ли данные для обновления
      if (!name && !surname && !patronymic && !password) {
        return res.status(400).json({ error: "Нет данных для обновления" });
      }

      let updateData = {};

      // Обновляем ФИО, если передано
      if (name) updateData.name = name;
      if (surname) updateData.surname = surname;
      if (patronymic !== undefined) updateData.patronymic = patronymic;

      // Если передан новый пароль – хешируем его перед сохранением
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateData.password = hashedPassword;
      }

      // Обновляем пользователя в БД
      const updatedUser = await prisma.users.update({
        where: { id: userId },
        data: updateData,
      });

      res.json({
        id: updatedUser.id,
        name: updatedUser.name,
        surname: updatedUser.surname,
        patronymic: updatedUser.patronymic,
      });
    } catch (error) {
      console.error("Ошибка обновления профиля", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },
};

module.exports = UserController;
