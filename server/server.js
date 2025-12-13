const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "https://repomain-nine.vercel.app",
      "http://localhost:*",
      "http://127.0.0.1:*",
      "*"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

console.log('📡 Socket.IO server initialized');

// Namespace для live prizes (вместо нативного WebSocket)
const livePrizesNamespace = io.of('/live-prizes');
const recentWins = [];
const MAX_RECENT_WINS = 20;

livePrizesNamespace.on('connection', (socket) => {
  console.log('✅ Live Prizes client connected:', socket.id);
  
  // Отправляем историю последних выигрышей
  socket.emit('init', { wins: recentWins });
  
  socket.on('win', (data) => {
    const winData = {
      prize: data.prize,
      isChips: data.isChips,
      color: data.color,
      imagePath: data.imagePath,
      timestamp: Date.now()
    };
    
    // Добавляем в историю
    recentWins.push(winData);
    if (recentWins.length > MAX_RECENT_WINS) {
      recentWins.shift();
    }
    
    // Рассылаем всем клиентам
    livePrizesNamespace.emit('new_win', { win: winData });
    
    console.log(`📣 Broadcast win: ${data.prize}${data.isChips ? ' chips' : '₽'}`);
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Live Prizes client disconnected:', socket.id);
  });
});

// Trust proxy - необходимо для работы за прокси (Render, Heroku и т.д.)
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://telegram.org",
        "https://cdn.socket.io"
      ],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'", 
        "data:", 
        "https:", 
        "http:",
        "https://raw.githubusercontent.com",
        "https://github.com"
      ],
      connectSrc: [
        "'self'",
        "https:",
        "wss:",
        "ws:"
      ],
      fontSrc: [
        "'self'", 
        "data:", 
        "https:",
        "https://fonts.gstatic.com"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"]
    }
  }
}));
app.use(cors());
app.use(express.json());

// Раздаем статические файлы (фронтенд)
// Определяем корневую директорию проекта
const projectRoot = path.join(__dirname, '..');
console.log('🔍 __dirname:', __dirname);
console.log('🔍 process.cwd():', process.cwd());
console.log('🔍 Project root:', projectRoot);

// Проверяем существование index.html
const indexPath = path.join(projectRoot, 'index.html');
const siteIndexPath = path.join(projectRoot, 'site', 'index.html');
if (fs.existsSync(indexPath)) {
  console.log('✅ Found bot index.html at:', indexPath);
} else {
  console.warn('⚠️ Bot index.html not found at:', indexPath);
}
if (fs.existsSync(siteIndexPath)) {
  console.log('✅ Found partner site index.html at:', siteIndexPath);
} else {
  console.warn('⚠️ Partner site index.html not found at:', siteIndexPath);
}

// Настройка маршрутов для двух сайтов
// 1. Сайт партнеров доступен по /partner/
app.use('/partner', express.static(path.join(projectRoot, 'site')));
console.log('📁 Сайт партнеров раздается из:', path.join(projectRoot, 'site'));

// 2. Остальные статические файлы из корня (бот)
app.use(express.static(projectRoot));
console.log('📁 Статические файлы бота раздаются из:', projectRoot);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // максимум 100 запросов
});
app.use('/api/', limiter);

// MongoDB подключение (опционально)
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI && MONGODB_URI.trim() !== '') {
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // Таймаут 5 секунд
  })
    .then(() => console.log('✅ MongoDB подключена'))
    .catch(err => {
      console.error('❌ MongoDB ошибка:', err.message);
      console.log('⚠️ Продолжаем работу без MongoDB (используется JSON хранилище)');
    });
} else {
  console.log('⚠️ MongoDB не настроена (работает без БД - используется JSON хранилище)');
}

// Модели (только если MongoDB подключена)
let User, Room, GameHistory;
if (MONGODB_URI && MONGODB_URI.trim() !== '') {
  try {
    User = require('./models/User');
    Room = require('./models/Room');
    GameHistory = require('./models/GameHistory');
  } catch (err) {
    console.error('⚠️ Ошибка загрузки моделей MongoDB:', err.message);
  }
}
// Хранилище активных пользователей и комнат
const onlineUsers = new Map(); // socketId -> userData
const activeRooms = new Map(); // roomId -> roomData
const userSockets = new Map(); // userId -> socketId

// Палитра цветов для игроков
const colors = [
  '#bde0fe', '#ffafcc', '#ade8f4', '#edede9', '#6f2dbd',
  '#b8c0ff', '#ff9e00', '#826aed', '#ffff3f', '#1dd3b0',
  '#ffd449', '#54defd', '#2fe6de', '#00f2f2', '#2d00f7',
  '#00ccf5', '#00f59b', '#7014f2', '#ff00ff', '#ffe017',
  '#44d800', '#ff8c00', '#ff3800', '#fff702', '#00ffff',
  '#00ffe0', '#00ffc0', '#00ffa0', '#00ffff', '#8000ff',
  '#02b3f6'
];

// Хранилище цветов игроков (userId -> color)
const playerColors = new Map();
const usedColors = new Set();

function getPlayerColor(userId) {
  if (!playerColors.has(userId)) {
    // Находим свободный цвет (не используемый другими игроками)
    let availableColors = colors.filter(color => !usedColors.has(color));
    
    // Если все цвета заняты, сбрасываем и начинаем заново
    if (availableColors.length === 0) {
      usedColors.clear();
      availableColors = [...colors];
    }
    
    // Назначаем случайный свободный цвет
    const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
    playerColors.set(userId, randomColor);
    console.log(`🎨 Игрок ${userId} получил уникальный цвет ${randomColor}`);
  }
  return playerColors.get(userId);
}

// ============ ROLL BOTS SYSTEM ============
const ROLL_BOTS = [
  { id: 'bot_den', nickname: 'den', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/1.png?raw=true' },
  { id: 'bot_sagarius', nickname: 'Sagarius', photoUrl: '/https://github.com/Pacific1a/img/blob/main/roll/2.png?raw=true' },
  { id: 'bot_dev_fenomen', nickname: 'dev_fenomen', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/3.png?raw=true' },
  { id: 'bot_majer', nickname: 'Majer', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/4.png?raw=true' },
  { id: 'bot_ovi', nickname: 'OVI', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/5.png?raw=true' },
  { id: 'bot_user', nickname: 'User', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/6.png?raw=true' },
  { id: 'bot_mr_baton', nickname: 'Mr.Baton', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/7.png?raw=true' },
  { id: 'bot_wal', nickname: 'Wal?!!?', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/8.png?raw=true' },
  { id: 'bot_r1mskyy', nickname: 'r1mskyy', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/9.png?raw=true' },
  { id: 'bot_crownfall', nickname: 'crownfall', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/10.png?raw=true' }
];

// Ставки ботов (рандомные от 100 до 2000)
const BOT_BET_MIN = 100;
const BOT_BET_MAX = 2000;
const BOT_BET_INTERVAL = 10000; // 10 секунд между ставками

// Активные боты и их состояние
const activeBotsData = new Map(); // botId -> { gamesPlayed, betTimer }

// Получить случайных ботов (без повтора ID и аватарок)
function getRandomBots(count) {
  const botsToAdd = [];
  const selectedIds = new Set();
  const usedAvatars = new Set(); // Отслеживаем уже использованные аватарки
  const shuffled = [...ROLL_BOTS].sort(() => Math.random() - 0.5);
  
  // Собираем уже используемые аватарки активных ботов
  const gameState = globalGames.roll;
  gameState.activeBots.forEach(activeBot => {
    usedAvatars.add(activeBot.photoUrl);
  });
  
  for (let i = 0; i < count && i < shuffled.length; i++) {
    const bot = shuffled[i];
    // Проверяем что бота еще нет в активных и аватарка не используется
    const alreadyActive = gameState.activeBots.find(b => b.id === bot.id);
    
    if (!alreadyActive && !selectedIds.has(bot.id) && !usedAvatars.has(bot.photoUrl)) {
      botsToAdd.push(bot);
      selectedIds.add(bot.id);
      usedAvatars.add(bot.photoUrl);
    }
  }
  
  return botsToAdd;
}

// Добавить ботов в игру
function addBotsToRoll(count) {
  const gameState = globalGames.roll;
  
  // НЕ добавляем ботов во время игры (только в waiting)
  if (gameState.status !== 'waiting') {
    console.log(`⚠️ Нельзя добавлять ботов во время игры (статус: ${gameState.status})`);
    return;
  }
  
  const botsToAdd = getRandomBots(count);
  
  botsToAdd.forEach(bot => {
    // Проверяем что бота еще нет
    if (!gameState.activeBots.find(b => b.id === bot.id)) {
      gameState.activeBots.push({
        id: bot.id,
        nickname: bot.nickname,
        photoUrl: bot.photoUrl,
        gamesPlayed: 0
      });
      
      activeBotsData.set(bot.id, {
        gamesPlayed: 0,
        betTimer: null
      });
      
      console.log(`🤖 Бот ${bot.nickname} добавлен в игру`);
    }
  });
}

// Функции ботов будут определены внутри io.on('connection') после startGlobalGame

// Глобальные игры (одна игра для всех пользователей)
const globalGames = {
  speedcash: {
    status: 'betting', // betting, racing, finished
    bettingTime: 5,
    blueMultiplier: 1.00,
    orangeMultiplier: 1.00,
    blueStopMultiplier: null,
    orangeStopMultiplier: null,
    delayedCar: null, // 'blue', 'orange', 'both', null
    winner: null,
    raceStartTime: null,
    bettingTimer: null,
    raceInterval: null,
    isInitialized: false
  },
  roll: {
    status: 'waiting', // waiting, betting, spinning
    players: [],
    timer: 30, // 30 секунд
    startTime: null,
    timerInterval: null,
    winner: null,
    totalBet: 0,
    bets: {},
    activeBots: [] // Активные боты в текущей сессии
  },
  crash: {
    status: 'waiting', // waiting, flying, crashed
    players: [],
    multiplier: 1.00,
    crashPoint: null,
    startTime: null,
    gameInterval: null,
    waitingTimer: null,
    waitingTime: 5, // 5 секунд ожидания
    isInitialized: false // Флаг инициализации
  },
  blackjack: {
    status: 'waiting', // waiting
    players: [], // Онлайн игроки
    history: [], // История последних игр
    isInitialized: false
  }
};

// Персистентное хранилище (JSON файлы)
const DATA_DIR = path.join(__dirname, 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// Создаем папку data если её нет
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('📁 Создана папка data/');
}

// Загрузка состояния из файлов
function loadPersistedData() {
  try {
    // Загружаем комнаты
    if (fs.existsSync(ROOMS_FILE)) {
      const roomsData = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
      roomsData.forEach(room => {
        room.createdAt = new Date(room.createdAt);
        activeRooms.set(room.id, room);
      });
      console.log(`✅ Загружено ${roomsData.length} комнат из файла`);
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки данных:', error);
  }
}

// Сохранение состояния в файлы
function savePersistedData() {
  try {
    // Сохраняем комнаты
    const roomsData = Array.from(activeRooms.values());
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(roomsData, null, 2));
  } catch (error) {
    console.error('❌ Ошибка сохранения данных:', error);
  }
}

// Автосохранение каждые 30 секунд
setInterval(savePersistedData, 30000);

// Загружаем данные при старте
loadPersistedData();

// ============ SOCKET.IO EVENTS ============

io.on('connection', (socket) => {
  console.log(`🔌 Новое подключение: ${socket.id}`);

  // Регистрация/авторизация пользователя
  socket.on('auth', async (telegramData) => {
    try {
      const { id, first_name, username, photo_url } = telegramData;
      
      // Находим или создаем пользователя
      let user;
      if (User) {
        user = await User.findOne({ telegramId: id });
        
        if (!user) {
          user = new User({
            telegramId: id,
            firstName: first_name,
            username: username,
            photoUrl: photo_url,
            nickname: first_name || username || `Player${id}`,
            stats: {
              gamesPlayed: 0,
              gamesWon: 0,
              totalWinnings: 0
            }
          });
          await user.save();
          console.log(`✅ Новый пользователь создан: ${user.nickname}`);
        } else {
          // Обновляем данные
          user.firstName = first_name;
          user.username = username;
          user.photoUrl = photo_url;
          user.lastSeen = new Date();
          await user.save();
        }
      } else {
        // Работаем без БД
        user = {
          _id: id,
          telegramId: id,
          nickname: first_name || username || `Player${id}`,
          photoUrl: photo_url,
          stats: { gamesPlayed: 0, gamesWon: 0, totalWinnings: 0 }
        };
      }

      // Сохраняем в онлайн
      onlineUsers.set(socket.id, {
        socketId: socket.id,
        userId: user._id.toString(),
        telegramId: id,
        nickname: user.nickname,
        photoUrl: photo_url,
        isOnline: true
      });
      
      userSockets.set(user._id.toString(), socket.id);

      socket.emit('auth_success', {
        user: {
          id: user._id,
          telegramId: user.telegramId,
          nickname: user.nickname,
          photoUrl: user.photoUrl,
          stats: user.stats
        }
      });

      // Отправляем список онлайн пользователей всем
      io.emit('online_users', Array.from(onlineUsers.values()));
      
      console.log(`✅ Пользователь авторизован: ${user.nickname} (${socket.id})`);
    } catch (error) {
      console.error('❌ Ошибка авторизации:', error);
      socket.emit('auth_error', { message: 'Ошибка авторизации' });
    }
  });

  // Получить список онлайн пользователей
  socket.on('get_online_users', () => {
    socket.emit('online_users', Array.from(onlineUsers.values()));
  });

  // Получить список комнат
  socket.on('get_rooms', () => {
    const rooms = Array.from(activeRooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      game: room.game,
      players: room.players.length,
      maxPlayers: room.maxPlayers,
      isPrivate: room.isPrivate,
      status: room.status
    }));
    socket.emit('rooms_list', rooms);
  });

  // Создать комнату
  socket.on('create_room', async (roomData) => {
    try {
      const user = onlineUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'Пользователь не авторизован' });
        return;
      }

      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const room = {
        id: roomId,
        name: roomData.name || `${user.nickname}'s room`,
        game: roomData.game || 'roll',
        hostId: user.userId,
        players: [{
          userId: user.userId,
          socketId: socket.id,
          nickname: user.nickname,
          photoUrl: user.photoUrl,
          isReady: false,
          isHost: true
        }],
        maxPlayers: roomData.maxPlayers || 3,
        isPrivate: roomData.isPrivate || false,
        status: 'waiting', // waiting, playing, finished
        gameState: {},
        createdAt: new Date()
      };

      activeRooms.set(roomId, room);
      socket.join(roomId);
      
      socket.emit('room_created', room);
      io.emit('room_added', {
        id: room.id,
        name: room.name,
        game: room.game,
        players: room.players.length,
        maxPlayers: room.maxPlayers,
        isPrivate: room.isPrivate,
        status: room.status
      });

      console.log(`🏠 Комната создана: ${room.name} (${roomId})`);
    } catch (error) {
      console.error('❌ Ошибка создания комнаты:', error);
      socket.emit('error', { message: 'Ошибка создания комнаты' });
    }
  });

  // Присоединиться к комнате
  socket.on('join_room', (roomId) => {
    try {
      const user = onlineUsers.get(socket.id);
      const room = activeRooms.get(roomId);

      if (!user) {
        socket.emit('error', { message: 'Пользователь не авторизован' });
        return;
      }

      if (!room) {
        socket.emit('error', { message: 'Комната не найдена' });
        return;
      }

      if (room.players.length >= room.maxPlayers) {
        socket.emit('error', { message: 'Комната заполнена' });
        return;
      }

      // Проверяем что пользователь еще не в комнате
      const alreadyInRoom = room.players.find(p => p.userId === user.userId);
      if (alreadyInRoom) {
        socket.emit('error', { message: 'Вы уже в этой комнате' });
        return;
      }

      room.players.push({
        userId: user.userId,
        socketId: socket.id,
        nickname: user.nickname,
        photoUrl: user.photoUrl,
        isReady: false,
        isHost: false
      });

      socket.join(roomId);
      
      // Уведомляем всех в комнате
      io.to(roomId).emit('player_joined', {
        player: {
          userId: user.userId,
          nickname: user.nickname,
          photoUrl: user.photoUrl
        },
        room: room
      });

      socket.emit('room_joined', room);
      
      console.log(`👤 ${user.nickname} присоединился к комнате ${room.name}`);
    } catch (error) {
      console.error('❌ Ошибка присоединения к комнате:', error);
      socket.emit('error', { message: 'Ошибка присоединения к комнате' });
    }
  });

  // Покинуть комнату
  socket.on('leave_room', (roomId) => {
    try {
      const user = onlineUsers.get(socket.id);
      const room = activeRooms.get(roomId);

      if (!room) return;

      room.players = room.players.filter(p => p.socketId !== socket.id);
      socket.leave(roomId);

      if (room.players.length === 0) {
        // Удаляем пустую комнату
        activeRooms.delete(roomId);
        io.emit('room_removed', roomId);
        console.log(`🗑️ Комната удалена: ${room.name}`);
      } else {
        // Назначаем нового хоста если нужно
        if (user && room.hostId === user.userId) {
          room.hostId = room.players[0].userId;
          room.players[0].isHost = true;
        }
        
        io.to(roomId).emit('player_left', {
          userId: user?.userId,
          room: room
        });
      }

      console.log(`👋 ${user?.nickname} покинул комнату`);
    } catch (error) {
      console.error('❌ Ошибка выхода из комнаты:', error);
    }
  });

  // Игрок готов
  socket.on('player_ready', (roomId) => {
    try {
      const user = onlineUsers.get(socket.id);
      const room = activeRooms.get(roomId);

      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        player.isReady = !player.isReady;
        io.to(roomId).emit('room_update', room);
        
        // Проверяем все ли готовы
        const allReady = room.players.every(p => p.isReady);
        if (allReady && room.players.length >= 2) {
          room.status = 'playing';
          io.to(roomId).emit('game_start', room);
          console.log(`🎮 Игра началась в комнате ${room.name}`);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка готовности игрока:', error);
    }
  });

  // Сделать ход в игре
  socket.on('make_move', async ({ roomId, move, gameData }) => {
    try {
      const user = onlineUsers.get(socket.id);
      const room = activeRooms.get(roomId);

      if (!room || !user) return;

      // Валидация хода (специфично для каждой игры)
      const isValidMove = validateMove(room.game, room.gameState, move, user.userId);
      
      if (!isValidMove) {
        socket.emit('invalid_move', { message: 'Недопустимый ход' });
        return;
      }

      // Обновляем состояние игры
      room.gameState = updateGameState(room.game, room.gameState, move, user.userId, gameData);
      
      // Отправляем обновление всем в комнате
      io.to(roomId).emit('game_update', {
        gameState: room.gameState,
        move: move,
        player: {
          userId: user.userId,
          nickname: user.nickname
        }
      });

      // Проверяем окончание игры
      const gameResult = checkGameEnd(room.game, room.gameState);
      if (gameResult.isFinished) {
        room.status = 'finished';
        
        // Сохраняем историю
        await saveGameHistory(room, gameResult);
        
        io.to(roomId).emit('game_end', {
          winner: gameResult.winner,
          results: gameResult.results
        });
        console.log(`🏁 Игра завершена в комнате ${room.name}`);
      }
    } catch (error) {
      console.error('❌ Ошибка хода:', error);
      socket.emit('error', { message: 'Ошибка обработки хода' });
    }
  });

  // Подключение к глобальной игре
  socket.on('join_game', ({ game }) => {
    socket.join(`global_${game}`);
    console.log(`🎮 Подключение к global_${game}`);
    
    const gameState = globalGames[game];
    if (gameState) {
      // Для blackjack отправляем другую структуру
      if (game === 'blackjack') {
        socket.emit('game_state_sync', {
          game: 'blackjack',
          status: gameState.status,
          players: gameState.players.map(p => ({
            userId: p.userId,
            nickname: p.nickname,
            photoUrl: p.photoUrl,
            lastSeen: p.lastSeen
          })),
          history: gameState.history
        });
      } else {
        // Отправляем текущее состояние игры
        socket.emit('game_state_sync', {
          game: game,
          status: gameState.status,
          players: gameState.players.map(p => ({
            userId: p.userId,
            nickname: p.nickname,
            photoUrl: p.photoUrl,
            bet: p.bet,
            color: p.color,
            isBot: p.isBot || String(p.userId).startsWith('bot_') // Добавляем флаг бота
          })),
          startTime: gameState.startTime
        });
      }
      
      // Crash: отправляем текущее состояние БЕЗ ЗАДЕРЖКИ
      if (game === 'crash') {
        if (!gameState.isInitialized) {
          // Первый запуск - сразу стартуем
          gameState.isInitialized = true;
          console.log('🚀 Crash: Первая инициализация');
          startCrashWaiting();
        } else if (gameState.status === 'waiting' && gameState.waitingTimer) {
          // Отправляем текущее время таймера СРАЗУ
          socket.emit('crash_waiting', {
            timeLeft: gameState.waitingTime
          });
          console.log(`⚡ Crash: Таймер ${gameState.waitingTime}`);
        } else if (gameState.status === 'flying' && gameState.gameInterval) {
          // Отправляем текущий множитель СРАЗУ
          socket.emit('crash_started', {
            startTime: gameState.startTime.toISOString()
          });
          socket.emit('crash_multiplier', {
            multiplier: parseFloat(gameState.multiplier.toFixed(2))
          });
          console.log(`⚡ Crash: Множитель ${gameState.multiplier.toFixed(2)}x`);
        }
      }
    }
  });

  // Получить состояние игры
  socket.on('get_game_state', ({ game }) => {
    const gameState = globalGames[game];
    if (!gameState) {
      console.error(`❌ Игра ${game} не найдена в globalGames`);
      return;
    }
    
    // Для blackjack отправляем другую структуру
    if (game === 'blackjack') {
      socket.emit('game_state_sync', {
        game: 'blackjack',
        status: gameState.status,
        players: gameState.players.map(p => ({
          userId: p.userId,
          nickname: p.nickname,
          photoUrl: p.photoUrl,
          lastSeen: p.lastSeen
        })),
        history: gameState.history
      });
      return;
    }
    
    // Для остальных игр (roll, crash и т.д.)
    const cleanState = {
      game: game,
      status: gameState.status,
      players: gameState.players.map(p => ({
        userId: p.userId,
        nickname: p.nickname,
        photoUrl: p.photoUrl,
        bet: p.bet,
        color: p.color, // ДОБАВЛЯЕМ ЦВЕТ
        isBot: p.isBot || String(p.userId).startsWith('bot_') // Добавляем флаг бота
      })),
      timer: gameState.timer,
      startTime: gameState.startTime ? gameState.startTime.toISOString() : null
    };
    socket.emit('game_state_sync', cleanState);
  });

  // Сделать ставку в глобальной игре
  socket.on('place_bet', async ({ game, userId, nickname, photoUrl, bet }) => {
    console.log(`📥 Получена ставка:`, { game, userId, nickname, bet });
    
    const gameState = globalGames[game];
    
    if (!gameState) {
      console.error(`❌ Игра ${game} не найдена`);
      return;
    }
    
    // Добавляем/обновляем игрока (только чистые данные)
    const existingPlayer = gameState.players.find(p => p.userId === userId);
    const playerColor = getPlayerColor(userId); // Получаем постоянный цвет
    
    if (existingPlayer) {
      existingPlayer.bet += bet;
      console.log(`➕ Обновлена ставка игрока ${nickname}: ${existingPlayer.bet}`);
    } else {
      // Создаем чистый объект игрока без циклических ссылок
      const cleanPlayer = {
        userId: userId,
        nickname: nickname,
        photoUrl: photoUrl || null,
        bet: bet,
        color: playerColor // Добавляем цвет
      };
      gameState.players.push(cleanPlayer);
      console.log(`✅ Добавлен новый игрок ${nickname} со ставкой ${bet}, цвет: ${playerColor}`);
    }

    // Отправляем всем в комнате (только чистые данные + цвет)
    io.to(`global_${game}`).emit('player_bet', { 
      userId: userId, 
      nickname: nickname, 
      photoUrl: photoUrl || null, 
      bet: bet,
      color: playerColor // Цвет доступен в обоих случаях
    });
    console.log(`📤 Отправлено обновление всем в global_${game}, игроков: ${gameState.players.length}`);

    // Запуск в зависимости от игры
    if (game === 'roll') {
      // Roll: минимум 2 игрока
      if (gameState.status === 'waiting' && gameState.players.length >= 2) {
        console.log(`🎮 Запускаем Roll`);
        startGlobalGame(game);
      } else if (gameState.status === 'waiting' && gameState.players.length === 1) {
        console.log(`⏳ Roll: Ожидание второго игрока...`);
      }
    } else if (game === 'crash') {
      // Crash: автозапуск всегда (не требуется ставок)
      // Логика автозапуска в crashCrashGame()
    }
  });

  // Запуск глобальной игры
  function startGlobalGame(game) {
    const gameState = globalGames[game];
    gameState.status = 'betting';
    gameState.startTime = new Date();
    
    // Отправляем чистые данные без циклических ссылок
    io.to(`global_${game}`).emit('game_started', {
      startTime: gameState.startTime.toISOString(), // Конвертируем Date в строку
      timer: gameState.timer
    });

    console.log(`🎮 Глобальная игра ${game} началась! Таймер: ${gameState.timer}с`);

    // Таймер
    gameState.timerInterval = setTimeout(() => {
      spinGlobalGame(game);
    }, gameState.timer * 1000);
  }

  // Крутим колесо
  function spinGlobalGame(game) {
    const gameState = globalGames[game];
    
    console.log(`🎰 spinGlobalGame вызван для ${game}, игроков: ${gameState.players.length}`);
    
    if (gameState.players.length === 0) {
      console.log(`⚠️ Нет игроков, сброс игры`);
      gameState.status = 'waiting';
      return;
    }

    // Останавливаем ставки ботов
    stopBotBets();

    // Выбираем победителя по весам (боты имеют +30% шанс)
    const totalBets = gameState.players.reduce((sum, p) => sum + p.bet, 0);
    
    // Рассчитываем взвешенные ставки (боты +50%, было +30%)
    const weightedBets = gameState.players.map(p => {
      const isBot = p.isBot || String(p.userId).startsWith('bot_');
      const weight = isBot ? p.bet * 1.5 : p.bet; // +50% для ботов
      return { player: p, weight };
    });
    
    const totalWeight = weightedBets.reduce((sum, w) => sum + w.weight, 0);
    const random = Math.random() * totalWeight;
    let sum = 0;
    let winner = gameState.players[0];

    for (const weighted of weightedBets) {
      sum += weighted.weight;
      if (random <= sum) {
        winner = weighted.player;
        break;
      }
    }

    // Увеличиваем счетчик игр для всех активных ботов (они участвовали в игре)
    gameState.players.forEach(player => {
      if (player.isBot || String(player.userId).startsWith('bot_')) {
        const botData = activeBotsData.get(player.userId);
        if (botData) {
          botData.gamesPlayed++;
          const isWinner = player.userId === winner.userId;
          console.log(`🤖 Бот ${player.nickname} ${isWinner ? 'выиграл' : 'участвовал'} (игр: ${botData.gamesPlayed}/2)`);
        }
      }
    });

    console.log(`🏆 Победитель в ${game}: ${winner.nickname} (userId: ${winner.userId}, бот: ${winner.isBot || String(winner.userId).startsWith('bot_')})`);
    
    // Сохраняем победителя в состоянии
    gameState.status = 'spinning';
    gameState.winner = winner.userId;

    // Вычисляем общую сумму для победителя
    const totalAmount = gameState.players.reduce((sum, p) => sum + p.bet, 0);

    io.to(`global_${game}`).emit('spin_wheel', { winner: winner.userId, amount: totalAmount });
    console.log(`📤 Отправлено событие spin_wheel в комнату global_${game} с winnerId: ${winner.userId}`);
    console.log(`📊 Клиентов в комнате global_${game}:`, io.sockets.adapter.rooms.get(`global_${game}`)?.size || 0);

    // Завершаем игру через 5 секунд
    setTimeout(() => {
      io.to(`global_${game}`).emit('game_finished', { winner: winner.userId });
      
      // Очищаем ботов после 2 игр
      cleanupBots();
      
      // Сбрасываем состояние
      gameState.status = 'waiting';
      gameState.players = [];
      gameState.startTime = null;
      
      // Очищаем ботов после 2 игр и проверяем нужно ли добавить новых
      setTimeout(() => {
        // Проверяем что игра все еще в waiting (могла начаться новая)
        if (gameState.status !== 'waiting') {
          console.log(`⏸️ Игра уже началась, откладываем добавление ботов`);
          return;
        }
        
        cleanupBots(); // Очищаем ботов после 2 игр
        
        // Проверяем количество активных ботов после очистки
        const currentBotCount = gameState.activeBots.length;
        const targetBotCount = 2 + Math.floor(Math.random() * 3); // 2-4 бота
        
        // Если ботов стало меньше, добавляем новых (только если игра в waiting)
        if (gameState.status === 'waiting' && currentBotCount < targetBotCount) {
          const botsToAdd = targetBotCount - currentBotCount;
          console.log(`🤖 После игры: добавляем ${botsToAdd} новых ботов (текущее: ${currentBotCount})`);
          addBotsToRoll(botsToAdd);
        }
        
        // Запускаем ставки для всех активных ботов (только если игра в waiting)
        if (gameState.status === 'waiting' && gameState.activeBots.length > 0) {
          startBotBets();
        }
      }, 2000);
      
      console.log(`🏁 Глобальная игра ${game} завершена`);
    }, 5000);
  }

  // ============ ROLL BOTS FUNCTIONS (внутри io.on для доступа к startGlobalGame) ============
  // Сделать ставку от бота
  function makeBotBet(botId) {
    const gameState = globalGames.roll;
    const botData = activeBotsData.get(botId);
    if (!botData) return;
    
    const bot = ROLL_BOTS.find(b => b.id === botId);
    if (!bot) return;
    
    // Не делаем ставки во время spinning
    if (gameState.status === 'spinning') {
      return;
    }
    
    // Получаем случайную ставку от 100 до 2000
    const betAmount = Math.floor(Math.random() * (BOT_BET_MAX - BOT_BET_MIN + 1)) + BOT_BET_MIN;
    
    // Симулируем ставку через place_bet
    const botColor = getPlayerColor(botId);
    
    // Добавляем/обновляем игрока
    const existingPlayer = gameState.players.find(p => p.userId === botId);
    if (existingPlayer) {
      existingPlayer.bet += betAmount;
    } else {
      const cleanPlayer = {
        userId: botId,
        nickname: bot.nickname,
        photoUrl: bot.photoUrl,
        bet: betAmount,
        color: botColor,
        isBot: true // Маркер бота
      };
      gameState.players.push(cleanPlayer);
    }
    
    // Отправляем всем в комнате
    io.to('global_roll').emit('player_bet', {
      userId: botId,
      nickname: bot.nickname,
      photoUrl: bot.photoUrl,
      bet: betAmount,
      color: botColor,
      isBot: true // Добавляем флаг бота
    });
    
    console.log(`🤖 Бот ${bot.nickname} сделал ставку ${betAmount}₽`);
    
    // Запускаем игру если нужно
    if (gameState.status === 'waiting' && gameState.players.length >= 2) {
      startGlobalGame('roll');
    }
    
    // Следующая ставка через 10 секунд (только если игра в waiting или betting)
    // НЕ планируем следующую ставку если бот уже сыграл 2 игры
    if (botData.gamesPlayed >= 2) {
      console.log(`🤖 Бот ${bot.nickname} достиг лимита игр (2), прекращаем ставки`);
      return; // Бот уже сыграл максимум игр
    }
    
    if (gameState.status === 'waiting' || gameState.status === 'betting') {
      botData.betTimer = setTimeout(() => {
        makeBotBet(botId);
      }, BOT_BET_INTERVAL);
    }
  }

  // Запуск ставок для ботов
  function startBotBets() {
    const gameState = globalGames.roll;
    
    // Задержки для ботов: 1, 3, 6, 9, 12 секунд и т.д.
    const botDelays = [1000, 3000, 6000, 9000, 12000, 15000, 18000, 21000, 24000, 27000];
    let delayIndex = 0;
    
    gameState.activeBots.forEach(bot => {
      const botData = activeBotsData.get(bot.id);
      if (!botData) return;
      
      // Пропускаем ботов которые уже сыграли 2 игры
      if (botData.gamesPlayed >= 2) {
        return;
      }
      
      // Первая ставка через разную задержку для каждого бота (1с, 3с, 6с и т.д.)
      const delay = botDelays[delayIndex % botDelays.length];
      delayIndex++;
      
      setTimeout(() => {
        makeBotBet(bot.id);
      }, delay);
    });
  }

  // Остановить ставки ботов
  function stopBotBets() {
    activeBotsData.forEach(botData => {
      if (botData.betTimer) {
        clearTimeout(botData.betTimer);
        botData.betTimer = null;
      }
    });
  }

  // Удалить ботов после 2 игр
  function cleanupBots() {
    const gameState = globalGames.roll;
    
    gameState.activeBots = gameState.activeBots.filter(bot => {
      const botData = activeBotsData.get(bot.id);
      if (botData && botData.gamesPlayed >= 2) {
        // Удаляем из активных
        activeBotsData.delete(bot.id);
        console.log(`🤖 Бот ${bot.nickname} удален после ${botData.gamesPlayed} игр`);
        return false;
      }
      return true;
    });
  }

  // Экспортируем функции ботов для использования в scheduleBotSpawn
  botFunctions = {
    startBotBets,
    stopBotBets,
    cleanupBots,
    makeBotBet
  };
  
  // Запускаем спавн ботов после первого подключения (только один раз)
  if (!scheduleBotSpawn.initialized) {
    scheduleBotSpawn.initialized = true;
    scheduleBotSpawn();
    
    // Первичная инициализация ботов через 2 секунды
    setTimeout(() => {
      const initialBots = 2 + Math.floor(Math.random() * 3); // 2-4 бота
      console.log(`🤖 Первичная инициализация ${initialBots} ботов в Roll...`);
      addBotsToRoll(initialBots);
      
      setTimeout(() => {
        if (botFunctions) {
          botFunctions.startBotBets();
        }
      }, 2000);
    }, 2000);
    
    // Также запускаем проверку сразу (чтобы боты добавлялись быстрее после удаления)
    setTimeout(() => {
      if (!botFunctions) return;
      const gameState = globalGames.roll;
      
      // НЕ добавляем ботов во время игры
      if (gameState.status !== 'waiting') {
        console.log(`⏸️ Быстрая проверка пропущена (статус: ${gameState.status})`);
        return;
      }
      
      botFunctions.cleanupBots();
      
      const currentBotCount = gameState.activeBots.length;
      const targetBotCount = 2 + Math.floor(Math.random() * 3);
      
      if (currentBotCount < targetBotCount) {
        const botsToAdd = targetBotCount - currentBotCount;
        console.log(`🤖 Быстрая проверка: добавляем ${botsToAdd} ботов`);
        addBotsToRoll(botsToAdd);
        
        setTimeout(() => {
          if (botFunctions && gameState.status === 'waiting') {
            botFunctions.startBotBets();
          }
        }, 1000);
      }
    }, 30000); // Проверка через 30 секунд после старта
  }

  // ============ CRASH GAME ============
  
  // Генерация взвешенного crash point (чаще низкие множители)
  function generateWeightedCrashPoint() {
    const rand = Math.random();
    
    // 85% - низкие множители (1.10, 1.15, 1.22, 1.28, 1.35) - УМЕНЬШЕНО
    if (rand < 0.85) {
      const lowMultipliers = [1.10, 1.15, 1.22, 1.28, 1.35];
      const randomLow = lowMultipliers[Math.floor(Math.random() * lowMultipliers.length)];
      // Добавляем небольшой разброс ±0.03
      return randomLow + (Math.random() - 0.5) * 0.06;
    }
    // 13% - средние множители (1.4-1.8) - УМЕНЬШЕНО
    else if (rand < 0.98) {
      return 1.4 + Math.random() * 0.4;
    }
    // 2% - высокие множители (>1.8, до 2.5) - УМЕНЬШЕНО
    else {
      return 1.8 + Math.random() * 0.7;
    }
  }
  
  // Запуск Crash (таймер ожидания)
  function startCrashWaiting() {
    const gameState = globalGames.crash;
    gameState.status = 'waiting';
    gameState.waitingTime = 5;
    
    console.log('⏳ Crash: Таймер ожидания 5 секунд...');
    
    // Очищаем старый таймер
    if (gameState.waitingTimer) {
      clearInterval(gameState.waitingTimer);
      gameState.waitingTimer = null;
    }
    
    // Отправляем начальное значение
    io.to('global_crash').emit('crash_waiting', {
      timeLeft: 5
    });
    
    // Таймер обратного отсчета
    gameState.waitingTimer = setInterval(() => {
      gameState.waitingTime--;
      
      io.to('global_crash').emit('crash_waiting', {
        timeLeft: gameState.waitingTime
      });
      
      if (gameState.waitingTime <= 0) {
        clearInterval(gameState.waitingTimer);
        gameState.waitingTimer = null;
        startCrashGame();
      }
    }, 1000);
  }
  
  // Запуск Crash игры
  function startCrashGame() {
    const gameState = globalGames.crash;
    gameState.status = 'flying';
    gameState.startTime = new Date();
    gameState.multiplier = 1.00;
    // Генерация crash point с уклоном в низкие значения
    // 75% - низкие множители (1.15-1.6), 20% - средние (1.6-2.0), 5% - высокие (>2.0)
    gameState.crashPoint = generateWeightedCrashPoint().toFixed(2);
    
    io.to('global_crash').emit('crash_started', {
      startTime: gameState.startTime.toISOString()
    });
    
    console.log(`🚀 Crash начался! Краш на: ${gameState.crashPoint}x`);
    
    // Увеличиваем множитель каждые 100мс (ускоряется с ростом)
    gameState.gameInterval = setInterval(() => {
      // Ускоряем рост по мере увеличения
      let increment = 0.01;
      if (gameState.multiplier > 2) increment = 0.02;
      if (gameState.multiplier > 5) increment = 0.05;
      if (gameState.multiplier > 10) increment = 0.1;
      
      gameState.multiplier += increment;
      
      io.to('global_crash').emit('crash_multiplier', {
        multiplier: parseFloat(gameState.multiplier.toFixed(2))
      });
      
      // Проверяем краш
      if (gameState.multiplier >= parseFloat(gameState.crashPoint)) {
        crashCrashGame();
      }
    }, 100);
  }
  
  // Краш
  function crashCrashGame() {
    const gameState = globalGames.crash;
    
    if (gameState.gameInterval) {
      clearInterval(gameState.gameInterval);
    }
    
    gameState.status = 'crashed';
    
    io.to('global_crash').emit('crash_ended', {
      crashPoint: parseFloat(gameState.crashPoint)
    });
    
    console.log(`💥 Crash упал на: ${gameState.crashPoint}x`);
    
    // Сброс через 3 секунды
    setTimeout(() => {
      gameState.players = [];
      gameState.multiplier = 1.00;
      gameState.status = 'waiting';
      
      io.to('global_crash').emit('game_state_sync', {
        status: 'waiting',
        players: [],
        multiplier: 1.00,
        crashPoint: null
      });
      
      console.log('🔄 Crash сброшен');
      
      // Автозапуск ВСЕГДА (не зависит от игроков)
      setTimeout(() => {
        startCrashWaiting();
      }, 1000);
    }, 3000);
  }
  
  // Cashout
  socket.on('crash_cashout', ({ game, userId }) => {
    const gameState = globalGames.crash;
    
    if (gameState.status !== 'flying') return;
    
    const player = gameState.players.find(p => p.userId === userId);
    if (!player || player.cashout) return;
    
    const cashout = Math.floor(player.bet * gameState.multiplier);
    player.cashout = cashout;
    player.multiplier = gameState.multiplier;
    
    io.to('global_crash').emit('player_cashout', {
      userId: userId,
      cashout: cashout,
      multiplier: gameState.multiplier
    });
    
    console.log(`💵 ${player.nickname} забрал ${cashout} на ${gameState.multiplier.toFixed(2)}x`);
  });

  // ============ SPEEDCASH ЛОГИКА ============
  
  // Подключение к SpeedCASH
  socket.on('join_speedcash', () => {
    socket.join('global_speedcash');
    console.log(`🚗 Подключение к SpeedCASH`);
    
    const gameState = globalGames.speedcash;
    
    if (!gameState.isInitialized) {
      gameState.isInitialized = true;
      startSpeedCashBetting();
    }
  });
  
  // Запрос текущего состояния игры
  socket.on('get_speedcash_state', () => {
    const gameState = globalGames.speedcash;
    
    // Рассчитываем elapsed время для racing
    let elapsed = 0;
    if (gameState.status === 'racing' && gameState.raceStartTime) {
      elapsed = Date.now() - gameState.raceStartTime;
    }
    
    socket.emit('speedcash_current_state', {
      status: gameState.status,
      timeLeft: gameState.bettingTime,
      blueMultiplier: gameState.blueMultiplier,
      orangeMultiplier: gameState.orangeMultiplier,
      blueTarget: gameState.blueStopMultiplier,
      orangeTarget: gameState.orangeStopMultiplier,
      delayedCar: gameState.delayedCar,
      elapsed: elapsed
    });
    
    console.log(`📊 Отправлено текущее состояние: ${gameState.status}, elapsed: ${elapsed}ms`);
  });
  
  // Запуск фазы ставок
  function startSpeedCashBetting() {
    const gameState = globalGames.speedcash;
    gameState.status = 'betting';
    gameState.bettingTime = 5;
    gameState.blueMultiplier = 1.00;
    gameState.orangeMultiplier = 1.00;
    gameState.winner = null;
    
    // Генерируем случайную длительность гонки (5-15 секунд)
    gameState.raceDuration = 5000 + Math.random() * 10000; // 5-15 секунд
    
    // Определяем задержанную машину (чаще обе задерживаются)
    const rand = Math.random();
    if (rand < 0.10) {
      // 10% - обе задержаны (было 1.5%)
      gameState.delayedCar = 'both';
    } else if (rand < 0.55) {
      // 45% - blue задержана, orange уезжает
      gameState.delayedCar = 'blue';
    } else {
      // 45% - orange задержана, blue уезжает
      gameState.delayedCar = 'orange';
    }
    
    console.log(`🚗 SpeedCASH: Betting started. Race duration: ${(gameState.raceDuration/1000).toFixed(1)}s, Delayed: ${gameState.delayedCar}`);
    
    io.to('global_speedcash').emit('speedcash_betting_start', {
      bettingTime: 5,
      delayedCar: gameState.delayedCar
    });
    
    // Таймер ставок
    if (gameState.bettingTimer) clearInterval(gameState.bettingTimer);
    
    gameState.bettingTimer = setInterval(() => {
      gameState.bettingTime--;
      
      io.to('global_speedcash').emit('speedcash_betting_timer', {
        timeLeft: gameState.bettingTime
      });
      
      if (gameState.bettingTime <= 0) {
        clearInterval(gameState.bettingTimer);
        startSpeedCashRace();
      }
    }, 1000);
  }
  
  // Запуск гонки
  function startSpeedCashRace() {
    const gameState = globalGames.speedcash;
    gameState.status = 'racing';
    gameState.raceStartTime = Date.now();
    
    io.to('global_speedcash').emit('speedcash_race_start', {
      delayedCar: gameState.delayedCar
    });
    
    console.log(`🏁 SpeedCASH: Race started! Duration: ${(gameState.raceDuration/1000).toFixed(1)}s`);
    
    // Обновляем множители каждые 100мс (оптимизация для мобильных)
    if (gameState.raceInterval) clearInterval(gameState.raceInterval);
    
    gameState.raceInterval = setInterval(() => {
      const elapsed = Date.now() - gameState.raceStartTime;
      
      // Проверяем не истекло ли время
      if (elapsed >= gameState.raceDuration && !gameState.raceEnding) {
        // Время истекло - отправляем race_end, но продолжаем рост 2 секунды
        gameState.raceEnding = true;
        
        let blueEscaped = false; // По умолчанию задержаны
        let orangeEscaped = false;
        
        if (gameState.delayedCar === 'blue') {
          blueEscaped = false; // Blue задержана
          orangeEscaped = true; // Orange уезжает
        } else if (gameState.delayedCar === 'orange') {
          blueEscaped = true; // Blue уезжает
          orangeEscaped = false; // Orange задержана
        } else if (gameState.delayedCar === 'both') {
          blueEscaped = false; // Обе задержаны
          orangeEscaped = false;
        }
        
        // Отправляем race_end сразу
        io.to('global_speedcash').emit('speedcash_race_end', {
          winner: blueEscaped && !orangeEscaped ? 'blue' : (!blueEscaped && orangeEscaped ? 'orange' : (blueEscaped && orangeEscaped ? 'both' : 'none')),
          blueMultiplier: parseFloat(gameState.blueMultiplier.toFixed(2)),
          orangeMultiplier: parseFloat(gameState.orangeMultiplier.toFixed(2)),
          blueEscaped,
          orangeEscaped
        });
        
        // Продолжаем рост еще 2 секунды, потом заканчиваем
        setTimeout(() => {
          if (gameState.raceInterval) {
            clearInterval(gameState.raceInterval);
            gameState.raceInterval = null;
          }
          gameState.status = 'finished';
          gameState.raceEnding = false;
          
          // Перезапуск через 3 секунды
          setTimeout(() => {
            startSpeedCashBetting();
          }, 3000);
        }, 2000);
      }
      
      // ОБЕ машины растут постоянно, НО после окончания гонки задержанные останавливаются
      const elapsedSeconds = elapsed / 1000;
      const baseIncrement = 0.01;
      const timeMultiplier = 1 + (elapsedSeconds / 10); // Ускорение
      
      // Blue растет если не задержана ИЛИ гонка еще не закончилась
      const blueIncrement = baseIncrement * timeMultiplier;
      const blueDetained = gameState.raceEnding && gameState.delayedCar === 'blue' || gameState.delayedCar === 'both';
      if (!blueDetained) {
        gameState.blueMultiplier += blueIncrement;
      }
      
      // Orange растет если не задержана ИЛИ гонка еще не закончилась
      const orangeIncrement = baseIncrement * timeMultiplier;
      const orangeDetained = gameState.raceEnding && gameState.delayedCar === 'orange' || gameState.delayedCar === 'both';
      if (!orangeDetained) {
        gameState.orangeMultiplier += orangeIncrement;
      }
      
      io.to('global_speedcash').emit('speedcash_multiplier_update', {
        blueMultiplier: parseFloat(gameState.blueMultiplier.toFixed(2)),
        orangeMultiplier: parseFloat(gameState.orangeMultiplier.toFixed(2))
      });
    }, 100); // Увеличено до 100ms для лучшей производительности на мобильных
  }

  // ============ BLACKJACK ============
  
  // Игрок зашел в blackjack
  socket.on('join_game_session', ({ game, userId, nickname, photoUrl }) => {
    if (game !== 'blackjack') return;
    
    const gameState = globalGames.blackjack;
    
    // Проверяем есть ли уже такой игрок
    const existingPlayer = gameState.players.find(p => p.userId === userId);
    if (!existingPlayer) {
      gameState.players.push({
        userId,
        nickname,
        photoUrl,
        lastSeen: Date.now()
      });
      console.log(`👤 BlackJack: Игрок ${nickname} зашел в игру`);
      
      // Уведомляем всех о новом игроке
      io.to('global_blackjack').emit('player_joined_game', {
        game: 'blackjack',
        userId,
        nickname,
        photoUrl
      });
    } else {
      // Обновляем lastSeen
      existingPlayer.lastSeen = Date.now();
    }
    
    // Отправляем текущее состояние новому игроку
    socket.emit('game_state_sync', {
      game: 'blackjack',
      status: gameState.status,
      players: gameState.players.map(p => ({
        userId: p.userId,
        nickname: p.nickname,
        photoUrl: p.photoUrl,
        lastSeen: p.lastSeen
      })),
      history: gameState.history
    });
  });
  
  // Результат игры blackjack
  socket.on('blackjack_result', ({ game, userId, nickname, photoUrl, bet, win, isWinner, multiplier }) => {
    if (game !== 'blackjack') return;
    
    const gameState = globalGames.blackjack;
    
    console.log(`🃏 BlackJack результат:`, { nickname, bet, win, isWinner, multiplier });
    
    // Добавляем в историю
    gameState.history.unshift({
      userId,
      nickname,
      photoUrl,
      bet,
      win,
      isWinner,
      multiplier,
      timestamp: Date.now()
    });
    
    // Оставляем только последние 20 игр
    if (gameState.history.length > 20) {
      gameState.history = gameState.history.slice(0, 20);
    }
    
    // Уведомляем всех о завершении игры
    io.to('global_blackjack').emit('blackjack_game_finished', {
      userId,
      nickname,
      photoUrl,
      bet,
      win,
      isWinner,
      multiplier
    });
    
    // Отправляем обновленное состояние
    io.to('global_blackjack').emit('game_state_sync', {
      game: 'blackjack',
      status: gameState.status,
      players: gameState.players,
      history: gameState.history
    });
  });
  
  // Очистка неактивных игроков blackjack (каждые 30 секунд)
  setInterval(() => {
    const gameState = globalGames.blackjack;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    const beforeCount = gameState.players.length;
    gameState.players = gameState.players.filter(p => {
      return (now - p.lastSeen) < fiveMinutes;
    });
    
    if (gameState.players.length !== beforeCount) {
      console.log(`🧹 BlackJack: Очищено ${beforeCount - gameState.players.length} неактивных игроков`);
    }
  }, 30000);
  
  // Отключение
  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    
    if (user) {
      // Удаляем из всех комнат
      activeRooms.forEach((room, roomId) => {
        const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          
          if (room.players.length === 0) {
            activeRooms.delete(roomId);
            io.emit('room_removed', roomId);
          } else {
            io.to(roomId).emit('player_left', {
              userId: user.userId,
              room: room
            });
          }
        }
      });

      onlineUsers.delete(socket.id);
      userSockets.delete(user.userId);
      
      io.emit('online_users', Array.from(onlineUsers.values()));
      console.log(`❌ Отключение: ${user.nickname} (${socket.id})`);
    }
  });
});

// ============ HELPER FUNCTIONS ============

function validateMove(game, gameState, move, userId) {
  // TODO: Реализовать валидацию для каждой игры
  return true;
}

function updateGameState(game, gameState, move, userId, gameData) {
  // TODO: Обновление состояния для каждой игры
  if (!gameState.moves) gameState.moves = [];
  gameState.moves.push({ userId, move, timestamp: new Date(), ...gameData });
  return gameState;
}

function checkGameEnd(game, gameState) {
  // TODO: Проверка окончания для каждой игры
  return { isFinished: false, winner: null, results: {} };
}

async function saveGameHistory(room, gameResult) {
  try {
    const historyEntry = {
      roomId: room.id,
      game: room.game,
      players: room.players.map(p => ({
        userId: p.userId,
        nickname: p.nickname,
        bet: gameResult.bets?.[p.userId] || 0,
        winnings: gameResult.winnings?.[p.userId] || 0,
        isWinner: gameResult.winner === p.userId
      })),
      winner: gameResult.winner,
      gameState: room.gameState,
      duration: Date.now() - room.createdAt.getTime(),
      createdAt: new Date()
    };

    // Сохраняем в MongoDB если доступна
    if (GameHistory) {
      const history = new GameHistory(historyEntry);
      await history.save();
      console.log('✅ История сохранена в MongoDB');
    } else {
      // Fallback: сохраняем в JSON файл
      let historyData = [];
      if (fs.existsSync(HISTORY_FILE)) {
        historyData = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      }
      historyData.push(historyEntry);
      
      // Храним только последние 1000 записей
      if (historyData.length > 1000) {
        historyData = historyData.slice(-1000);
      }
      
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyData, null, 2));
      console.log('✅ История сохранена в JSON файл');
    }
  } catch (error) {
    console.error('❌ Ошибка сохранения истории:', error);
  }
}

// ============ REST API ============

// Главная страница - ЗАКОММЕНТИРОВАН, используется express.static + fallback
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, '..', 'index.html'));
// });

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/stats', async (req, res) => {
  try {
    let totalUsers = 0;
    let totalGames = 0;

    if (User && GameHistory) {
      totalUsers = await User.countDocuments();
      totalGames = await GameHistory.countDocuments();
    } else {
      // Читаем из JSON файлов
      if (fs.existsSync(HISTORY_FILE)) {
        const historyData = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        totalGames = historyData.length;
      }
    }
    
    res.json({
      totalUsers,
      totalGames,
      onlineUsers: onlineUsers.size,
      activeRooms: activeRooms.size,
      usingMongoDB: !!User
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/history', (req, res) => {
  try {
    let historyData = [];
    
    if (fs.existsSync(HISTORY_FILE)) {
      historyData = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
    
    // Возвращаем последние 50 игр
    res.json(historyData.slice(-50).reverse());
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// BALANCE API - Управление балансами игроков
// ============================================

const BALANCES_FILE = path.join(DATA_DIR, 'balances.json');

// Инициализация файла балансов если его нет
if (!fs.existsSync(BALANCES_FILE)) {
  fs.writeFileSync(BALANCES_FILE, JSON.stringify({}, null, 2));
}

// Функция для получения баланса из базы данных бота (заглушка)
// Путь к базе данных бота
const BOT_DB_PATH = path.join(__dirname, '..', 'autoshop', 'tgbot', 'data', 'database.db');

// На Render better-sqlite3 не работает из-за несовместимости архитектур
// Используем JSON/MongoDB fallback
function getBotBalance(telegramId) {
  console.log('⚠️ SQLite disabled on Render, using JSON/MongoDB fallback');
  return null;
}

// Функция для обновления баланса в базе данных бота (заглушка)
function updateBotBalance(telegramId, rubles) {
  console.log('⚠️ SQLite disabled on Render, using JSON/MongoDB fallback');
  return false;
}

// Получить баланс пользователя
app.get('/api/balance/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    
    // Приоритет 1: Читаем из базы данных бота (SQLite)
    const botBalance = getBotBalance(telegramId);
    if (botBalance !== null) {
      console.log(`💰 Balance loaded from bot DB for ${telegramId}: ${botBalance.rubles}₽`);
      res.json(botBalance);
      return;
    }
    
    // Приоритет 2: MongoDB
    if (User) {
      let user = await User.findOne({ telegramId });
      if (!user) {
        // Создаем нового пользователя с дефолтным балансом
        user = await User.create({
          telegramId,
          nickname: `User${telegramId.slice(-4)}`,
          balance: {
            coins: 0,
            chips: 0
          }
        });
      }
      res.json({
        rubles: user.balance.coins || 0,
        chips: user.balance.chips || 0
      });
      return;
    }
    
    // Приоритет 3: JSON файл (fallback)
    const balances = JSON.parse(fs.readFileSync(BALANCES_FILE, 'utf8'));
    const userBalance = balances[telegramId] || { rubles: 0, chips: 0 };
    console.log(`💰 Balance loaded from JSON for ${telegramId}: ${userBalance.rubles}₽`);
    res.json(userBalance);
  } catch (error) {
    console.error('❌ Error getting balance:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Обновить баланс пользователя
app.post('/api/balance/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { rubles, chips } = req.body;
    
    const finalRubles = parseFloat(rubles) || 0;
    const finalChips = parseInt(chips) || 0;
    
    // Приоритет 1: Обновляем базу данных бота (SQLite)
    if (fs.existsSync(BOT_DB_PATH)) {
      const updated = updateBotBalance(telegramId, finalRubles);
      if (updated) {
        console.log(`💰 Balance updated in bot DB for ${telegramId}: ${finalRubles}₽`);
        res.json({ rubles: finalRubles, chips: finalChips });
        
        // Уведомляем всех клиентов об обновлении через WebSocket
        io.emit(`balance_updated_${telegramId}`, {
          rubles: finalRubles,
          chips: finalChips,
          timestamp: Date.now()
        });
        return;
      }
    }
    
    // Приоритет 2: MongoDB
    if (User) {
      let user = await User.findOne({ telegramId });
      if (!user) {
        user = await User.create({
          telegramId,
          nickname: `User${telegramId.slice(-4)}`,
          balance: {
            coins: finalRubles,
            chips: finalChips
          }
        });
      } else {
        if (rubles !== undefined && rubles !== null) {
          user.balance.coins = finalRubles;
        }
        if (chips !== undefined && chips !== null) {
          user.balance.chips = finalChips;
        }
        await user.save();
      }
      
      res.json({
        rubles: user.balance.coins,
        chips: user.balance.chips
      });
      
      // Уведомляем всех клиентов
      io.emit(`balance_updated_${telegramId}`, {
        rubles: user.balance.coins,
        chips: user.balance.chips,
        timestamp: Date.now()
      });
      return;
    }
    
    // Приоритет 3: JSON файл (fallback)
    const balances = JSON.parse(fs.readFileSync(BALANCES_FILE, 'utf8'));
    balances[telegramId] = { rubles: finalRubles, chips: finalChips };
    fs.writeFileSync(BALANCES_FILE, JSON.stringify(balances, null, 2));
    
    console.log(`💰 Balance updated in JSON for ${telegramId}: ${finalRubles}₽, ${finalChips} chips`);
    res.json(balances[telegramId]);
    
    // Уведомляем всех клиентов
    io.emit(`balance_updated_${telegramId}`, {
      rubles: finalRubles,
      chips: finalChips,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('❌ Error updating balance:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Добавить средства к балансу (для админа/тестирования)
app.post('/api/balance/:telegramId/add', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { rubles, chips } = req.body;
    
    const addRubles = parseFloat(rubles) || 0;
    const addChips = parseInt(chips) || 0;
    
    // Приоритет 1: Обновляем базу данных бота (SQLite)
    if (fs.existsSync(BOT_DB_PATH)) {
      const currentBalance = getBotBalance(telegramId);
      if (currentBalance !== null) {
        const newRubles = currentBalance.rubles + addRubles;
        const updated = updateBotBalance(telegramId, newRubles);
        if (updated) {
          console.log(`➕ Balance added in bot DB for ${telegramId}: +${addRubles}₽ (total: ${newRubles}₽)`);
          const finalBalance = { rubles: newRubles, chips: currentBalance.chips + addChips };
          res.json(finalBalance);
          
          // Уведомляем всех клиентов
          io.emit(`balance_updated_${telegramId}`, {
            ...finalBalance,
            amount: addRubles,
            timestamp: Date.now(),
            transaction: {
              type: 'add',
              amount: addRubles,
              timestamp: Date.now()
            }
          });
          return;
        }
      }
    }
    
    // Приоритет 2: MongoDB
    if (User) {
      let user = await User.findOne({ telegramId });
      if (!user) {
        user = await User.create({
          telegramId,
          nickname: `User${telegramId.slice(-4)}`,
          balance: {
            coins: addRubles,
            chips: addChips
          }
        });
      } else {
        user.balance.coins = (user.balance.coins || 0) + addRubles;
        user.balance.chips = (user.balance.chips || 0) + addChips;
        await user.save();
      }
      
      res.json({
        rubles: user.balance.coins,
        chips: user.balance.chips
      });
      
      // Уведомляем всех клиентов
      io.emit(`balance_updated_${telegramId}`, {
        rubles: user.balance.coins,
        chips: user.balance.chips,
        amount: addRubles,
        timestamp: Date.now(),
        transaction: {
          type: 'add',
          amount: addRubles,
          timestamp: Date.now()
        }
      });
      return;
    }
    
    // Приоритет 3: JSON файл (fallback)
    const balances = JSON.parse(fs.readFileSync(BALANCES_FILE, 'utf8'));
    const currentBalance = balances[telegramId] || { rubles: 0, chips: 0 };
    balances[telegramId] = {
      rubles: currentBalance.rubles + addRubles,
      chips: currentBalance.chips + addChips
    };
    fs.writeFileSync(BALANCES_FILE, JSON.stringify(balances, null, 2));
    
    console.log(`➕ Balance added in JSON for ${telegramId}: +${addRubles}₽, +${addChips} chips`);
    res.json(balances[telegramId]);
    
    // Уведомляем всех клиентов
    io.emit(`balance_updated_${telegramId}`, {
      ...balances[telegramId],
      amount: addRubles,
      timestamp: Date.now(),
      transaction: {
        type: 'add',
        amount: addRubles,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('❌ Error adding balance:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить список всех пользователей с балансами (для админа)
app.get('/api/admin/balances', async (req, res) => {
  try {
    if (User) {
      const users = await User.find({}, 'telegramId nickname balance').limit(100);
      res.json(users.map(u => ({
        telegramId: u.telegramId,
        nickname: u.nickname,
        rubles: u.balance.coins || 0,
        chips: u.balance.chips || 0
      })));
    } else {
      const balances = JSON.parse(fs.readFileSync(BALANCES_FILE, 'utf8'));
      res.json(Object.entries(balances).map(([telegramId, balance]) => ({
        telegramId,
        rubles: balance.rubles,
        chips: balance.chips
      })));
    }
  } catch (error) {
    console.error('❌ Error getting balances:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// TRANSACTIONS API - История транзакций
// ============================================

const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');

// Инициализация файла транзакций
if (!fs.existsSync(TRANSACTIONS_FILE)) {
  fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify({}, null, 2));
}

// Получить историю транзакций пользователя
app.get('/api/transactions/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const transactions = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
    const userTransactions = transactions[telegramId] || [];
    
    // Возвращаем последние N транзакций
    res.json(userTransactions.slice(-limit).reverse());
  } catch (error) {
    console.error('❌ Error getting transactions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Добавить транзакцию
app.post('/api/transactions/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { type, amount, source, description } = req.body;
    
    const transactions = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
    
    if (!transactions[telegramId]) {
      transactions[telegramId] = [];
    }
    
    const transaction = {
      id: Date.now().toString(),
      type, // 'add', 'subtract', 'win', 'bet', 'transfer'
      amount: parseFloat(amount),
      source: source || 'system', // 'bot', 'game', 'admin', 'system'
      description: description || '',
      timestamp: Date.now(),
      date: new Date().toISOString()
    };
    
    transactions[telegramId].push(transaction);
    
    // Храним только последние 100 транзакций на пользователя
    if (transactions[telegramId].length > 100) {
      transactions[telegramId] = transactions[telegramId].slice(-100);
    }
    
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
    
    // Отправляем через WebSocket
    io.emit(`transaction_added_${telegramId}`, transaction);
    
    res.json(transaction);
    console.log(`📝 Transaction added for ${telegramId}: ${type} ${amount}`);
  } catch (error) {
    console.error('❌ Error adding transaction:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// REFERRAL API ENDPOINTS
// ============================================
// Добавьте этот код в server.js

const REFERRALS_FILE = path.join(DATA_DIR, 'referrals.json');

// Создаем файл если его нет
if (!fs.existsSync(REFERRALS_FILE)) {
  fs.writeFileSync(REFERRALS_FILE, JSON.stringify({}));
}

// ============ REFERRAL ENDPOINTS ============

// Получить данные о рефералах пользователя
app.get('/api/referral/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const data = await referralDB.getReferralData(telegramId);
    res.json(data);
    console.log(`📊 Referral data loaded for ${telegramId} (${referralDB.isMongoAvailable() ? 'MongoDB' : 'JSON'})`);
  } catch (error) {
    console.error('❌ Error loading referral data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Зарегистрировать реферала
app.post('/api/referral/register', async (req, res) => {
  try {
    let { userId, referrerId } = req.body;
    
    if (!userId || !referrerId) {
      return res.status(400).json({ error: 'Missing userId or referrerId' });
    }
    
    // Если referrerId приходит в формате base36 (короткий код) - декодируем
    if (referrerId.length < 8 && /^[A-Z0-9]+$/i.test(referrerId)) {
      try {
        referrerId = String(parseInt(referrerId, 36));
        console.log(`🔄 Decoded base36 code to ID: ${referrerId}`);
      } catch (e) {
        console.log(`⚠️ Failed to decode referrer code: ${referrerId}`);
      }
    }
    
    // Проверяем, не пытается ли пользователь пригласить сам себя
    if (userId === referrerId) {
      return res.status(400).json({ error: 'Cannot refer yourself' });
    }
    
    const result = await referralDB.registerReferral(userId, referrerId);
    res.json(result);
  } catch (error) {
    console.error('❌ Error registering referral:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Начислить процент рефереру
app.post('/api/referral/add-earnings', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({ error: 'Missing userId or amount' });
    }
    
    const result = await referralDB.addReferralEarnings(userId, amount);
    
    if (result.success) {
      console.log(`💰 Added ${result.commission}₽ to referrer ${result.referrerId} from ${userId}'s win ${amount}₽`);
      
      // Отправляем через WebSocket
      io.emit(`referral_earnings_${result.referrerId}`, {
        userId: userId,
        amount: result.commission,
        totalBalance: result.newBalance
      });
      
      res.json({ 
        success: true, 
        referrerId: result.referrerId,
        commission: result.commission,
        referralBalance: result.newBalance
      });
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error('❌ Error adding earnings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить данные пользователя Telegram
app.get('/api/telegram-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    
    // Получаем данные пользователя через Bot API
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      console.warn('⚠️ BOT_TOKEN not found in environment');
      return res.json({ success: false, message: 'Bot token not configured' });
    }
    
    // Получаем профиль
    const profileResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${userId}`);
    const profileData = await profileResponse.json();
    
    if (!profileData.ok) {
      console.warn(`⚠️ Failed to get user profile for ${userId}:`, profileData);
      return res.json({ success: false, message: 'User not found' });
    }
    
    const user = profileData.result;
    let photo_url = null;
    
    // Получаем аватарку
    try {
      const photosResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${userId}&limit=1`);
      const photosData = await photosResponse.json();
      
      if (photosData.ok && photosData.result.total_count > 0) {
        const fileId = photosData.result.photos[0][0].file_id;
        
        // Получаем путь к файлу
        const fileResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const fileData = await fileResponse.json();
        
        if (fileData.ok) {
          photo_url = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
        }
      }
    } catch (photoError) {
      console.warn(`⚠️ Failed to get photo for ${userId}:`, photoError);
    }
    
    res.json({
      success: true,
      user_id: userId,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      photo_url: photo_url
    });
    
  } catch (error) {
    console.error('❌ Error getting telegram user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Вывести средства с реферального баланса
app.post('/api/referral/withdraw', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({ error: 'Missing userId or amount' });
    }
    
    const result = await referralDB.withdrawReferralBalance(userId, amount);
    
    if (result.success) {
      // Добавляем на основной баланс
      const balances = JSON.parse(fs.readFileSync(BALANCES_FILE, 'utf8'));
      if (!balances[userId]) {
        balances[userId] = { rubles: 0, chips: 0 };
      }
      balances[userId].rubles += result.transferred;
      fs.writeFileSync(BALANCES_FILE, JSON.stringify(balances, null, 2));
      
      // Создаем транзакцию
      const transactions = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
      if (!transactions[userId]) {
        transactions[userId] = [];
      }
      transactions[userId].push({
        id: Date.now().toString(),
        type: 'add',
        amount: result.transferred,
        source: 'referral',
        description: `Вывод с реферального баланса (комиссия ${result.commission.toFixed(2)}₽)`,
        timestamp: Date.now(),
        date: new Date().toISOString()
      });
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
      
      console.log(`💸 Withdrawal: ${result.withdrawn}₽ from referral balance, ${result.transferred}₽ to main (commission: ${result.commission}₽)`);
      
      // Уведомляем через WebSocket
      io.emit(`balance_updated_${userId}`, {
        rubles: balances[userId].rubles,
        chips: balances[userId].chips
      });
      
      res.json({
        success: true,
        withdrawn: result.withdrawn,
        commission: result.commission,
        transferred: result.transferred,
        newReferralBalance: result.newBalance,
        newMainBalance: balances[userId].rubles
      });
    } else {
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      res.json(result);
    }
  } catch (error) {
    console.error('❌ Error withdrawing:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

console.log('✅ Referral API endpoints loaded');

// ============ ROLL BOTS AUTO-SPAWN ============
// Переменные для хранения ссылок на функции ботов из io.on
let botFunctions = null;

// Периодически добавляем ботов (2-4 бота)
function scheduleBotSpawn() {
  // Проверяем и добавляем ботов каждые 5 минут
  const botCheckInterval = 5 * 60 * 1000; // 5 минут
  
  setInterval(() => {
    if (!botFunctions) return; // Функции еще не инициализированы
    
    const gameState = globalGames.roll;
    
    // НЕ добавляем ботов во время игры
    if (gameState.status !== 'waiting') {
      console.log(`⏸️ Пропускаем добавление ботов (статус игры: ${gameState.status})`);
      return;
    }
    
    // Очищаем старых ботов (после 2 игр)
    botFunctions.cleanupBots();
    
    // Проверяем количество активных ботов
    const currentBotCount = gameState.activeBots.length;
    const targetBotCount = 2 + Math.floor(Math.random() * 3); // 2-4 бота
    
    // Если ботов меньше целевого количества, добавляем новых
    if (currentBotCount < targetBotCount) {
      const botsToAdd = targetBotCount - currentBotCount;
      console.log(`🤖 Добавляем ${botsToAdd} новых ботов (текущее: ${currentBotCount}, целевое: ${targetBotCount})`);
      addBotsToRoll(botsToAdd);
      
      // Запускаем ставки для новых ботов
      setTimeout(() => {
        if (botFunctions) {
          botFunctions.startBotBets();
        }
      }, 1000);
    } else {
      console.log(`🤖 Достаточно ботов (${currentBotCount}), ожидание...`);
    }
  }, botCheckInterval);
}

// Fallback для SPA - все неизвестные маршруты возвращают соответствующий index.html
// Это должно быть после всех API маршрутов
app.get('*', (req, res) => {
  // Если запрос к API - возвращаем 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Если запрос к сайту партнеров - отдаем site/index.html
  if (req.path.startsWith('/partner')) {
    const siteIndexHtmlPath = path.join(projectRoot, 'site', 'index.html');
    if (fs.existsSync(siteIndexHtmlPath)) {
      return res.sendFile(siteIndexHtmlPath);
    }
  }
  
  // Для всех остальных маршрутов отдаем корневой index.html (бот)
  const indexHtmlPath = path.join(projectRoot, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    res.sendFile(indexHtmlPath);
  } else {
    res.status(404).send('index.html not found');
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 WebSocket готов к подключениям`);
  console.log(`💾 Персистентное хранилище: ${DATA_DIR}`);
  console.log(`🗄️ MongoDB: ${MONGODB_URI && MONGODB_URI.trim() !== '' ? 'Настроена' : 'Отключена (используется JSON)'}`);
  console.log(`🤖 Система ботов Roll будет активирована после первого подключения`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️ Получен сигнал остановки...');
  savePersistedData();
  console.log('✅ Данные сохранены');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Получен сигнал завершения...');
  savePersistedData();
  console.log('✅ Данные сохранены');
  process.exit(0);
});
