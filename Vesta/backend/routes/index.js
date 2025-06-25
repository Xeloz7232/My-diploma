const express = require('express');
const { UserController, TaskController, DataController, ApiController } = require('../controllers');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/access');
const router = express.Router();
const path = require('path');
const multer = require('multer');

// Настраиваем хранилище
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    // Добавляем метку времени, чтобы не было коллизий имён
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  // Разрешаем изображения и PDF
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Допускаются только изображения и PDF-файлы'), false);
  }
};

const upload = multer({ storage, fileFilter });

router.post('/register', UserController.register);
router.post('/login', UserController.login);
router.get('/user', authenticateToken, UserController.getUserProfile);
router.put('/user', authenticateToken, UserController.updateUser);

router.post('/tasks', authenticateToken, checkRole(["ППКС"]), TaskController.createTask);
router.get('/tasks', authenticateToken, checkRole(["ППКС", "Сервисный центр"]), TaskController.getAllTasks);
router.get('/archive', authenticateToken, checkRole(["ППКС", "Сервисный центр"]), TaskController.getClosedTasks);
router.get('/tasks/:id', authenticateToken, checkRole(["ППКС", "Сервисный центр"]), TaskController.getTaskById);
router.delete('/tasks/:id', authenticateToken, checkRole(["ППКС"]), TaskController.deleteTask);
router.put('/tasks/:id', authenticateToken, checkRole(["ППКС", "Сервисный центр"]), TaskController.updateTask);
router.put('/upload/:task_id', authenticateToken, checkRole(["Сервисный центр"]), upload.single('conclusion'), TaskController.uploadConclusion);
router.get('/download/:task_id', authenticateToken, checkRole(["ППКС", "Сервисный центр"]), TaskController.downloadConclusion);
router.get('/print/:id', authenticateToken, checkRole(["ППКС"]), TaskController.actPrinting);
router.post('/takeaway', authenticateToken, checkRole(["ППКС"]), TaskController.takeawayPrinting);

router.get('/data', authenticateToken, checkRole(["ППКС", "Сервисный центр"]), DataController.getData);
router.get('/stats', authenticateToken, checkRole(["ППКС", "Сервисный центр"]), DataController.getStatistic);
router.get('/coords', authenticateToken, checkRole(["ППКС"]), DataController.addressLocation);

router.get('/getSiriusData/:task_number', authenticateToken, checkRole(["ППКС", "Сервисный центр"]), ApiController.getSiriusData);

module.exports = router;