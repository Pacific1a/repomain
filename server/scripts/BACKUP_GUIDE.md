# 🔄 Backup & Restore Guide

Полная система бэкапа и восстановления проекта Duo Partners.

---

## 📦 Создание бэкапа

### Ручной бэкап

```bash
cd /var/www/duo/server
node scripts/backup.js
```

Бэкап будет сохранен в `../backups/duo-backup-<timestamp>/`

### Бэкап в указанную директорию

```bash
node scripts/backup.js /home/backups
```

### Что включается в бэкап

- ✅ База данных (`data/database.db`)
- ✅ Конфигурация (`.env`)
- ✅ Зависимости (`package.json`)
- ✅ Архив всего проекта (`.tar.gz`)
- ✅ Метаданные бэкапа (`backup-info.json`)

**Исключается:**
- ❌ `node_modules/` (восстанавливается через npm install)
- ❌ `.git/` (версионирование)
- ❌ Логи (`*.log`)

---

## 🔧 Восстановление из бэкапа

### Список доступных бэкапов

```bash
cd /var/www/duo
ls -lh backups/
```

### Восстановление

```bash
cd /var/www/duo/server
node scripts/restore.js ../backups/duo-backup-2026-01-01T12-00-00
```

**Внимание:** Скрипт создаст бэкап текущей БД перед восстановлением!

### После восстановления

```bash
# 1. Установить зависимости (если нужно)
npm install

# 2. Перезапустить сервер
pm2 restart duo-server

# 3. Проверить статус
pm2 status
pm2 logs duo-server
```

---

## ⏰ Автоматический бэкап (Cron)

### Настройка ежедневного бэкапа

```bash
# Открыть crontab
crontab -e

# Добавить задачу (бэкап каждый день в 3:00 ночи)
0 3 * * * cd /var/www/duo/server && /usr/bin/node scripts/backup.js /home/backups >> /var/log/duo-backup.log 2>&1

# Бэкап каждые 6 часов
0 */6 * * * cd /var/www/duo/server && /usr/bin/node scripts/backup.js /home/backups >> /var/log/duo-backup.log 2>&1
```

### Проверка логов cron

```bash
tail -f /var/log/duo-backup.log
```

---

## 🧹 Управление бэкапами

### Автоматическая очистка

Скрипт автоматически хранит **последние 10 бэкапов** и удаляет старые.

### Ручное удаление старых бэкапов

```bash
# Удалить бэкапы старше 30 дней
find /var/www/duo/backups -name "duo-backup-*" -mtime +30 -exec rm -rf {} \;

# Удалить все кроме последних 5
cd /var/www/duo/backups
ls -t duo-backup-* | tail -n +6 | xargs rm -rf
```

### Проверка размера бэкапов

```bash
du -sh /var/www/duo/backups/*
```

---

## 🌐 Удаленный бэкап

### На другой сервер (rsync)

```bash
# Копирование на удаленный сервер
rsync -avz /var/www/duo/backups/ user@backup-server:/backups/duo/

# Добавить в cron для автоматической синхронизации
0 4 * * * rsync -avz /var/www/duo/backups/ user@backup-server:/backups/duo/ >> /var/log/duo-rsync.log 2>&1
```

### В облако (AWS S3, Dropbox и т.д.)

```bash
# Пример для AWS S3
aws s3 sync /var/www/duo/backups/ s3://my-bucket/duo-backups/

# Добавить в cron
0 5 * * * aws s3 sync /var/www/duo/backups/ s3://my-bucket/duo-backups/ >> /var/log/duo-s3.log 2>&1
```

---

## 🚨 Восстановление после катастрофы

### Полное восстановление на новом сервере

1. **Установить Node.js и зависимости:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

2. **Скопировать проект:**
```bash
mkdir -p /var/www
cd /var/www
# Загрузить архив с бэкапа
tar -xzf duo-backup-TIMESTAMP.tar.gz
cd duo/server
```

3. **Восстановить базу данных:**
```bash
node scripts/restore.js /path/to/backup/duo-backup-TIMESTAMP
```

4. **Установить зависимости:**
```bash
npm install
cd ../../bot
npm install
```

5. **Запустить сервер:**
```bash
cd /var/www/duo/server
pm2 start server.js --name duo-server
pm2 save
pm2 startup
```

6. **Проверить работу:**
```bash
pm2 status
pm2 logs duo-server
curl http://localhost:3000/api/health
```

---

## 📊 Мониторинг бэкапов

### Проверка последнего бэкапа

```bash
#!/bin/bash
LAST_BACKUP=$(ls -t /var/www/duo/backups/duo-backup-* 2>/dev/null | head -1)

if [ -z "$LAST_BACKUP" ]; then
    echo "❌ No backups found!"
    exit 1
fi

BACKUP_AGE=$(($(date +%s) - $(stat -c %Y "$LAST_BACKUP")))
HOURS=$((BACKUP_AGE / 3600))

echo "✅ Last backup: $LAST_BACKUP"
echo "⏰ Age: $HOURS hours ago"

if [ $HOURS -gt 24 ]; then
    echo "⚠️  Backup is older than 24 hours!"
fi
```

Сохранить как `/usr/local/bin/check-duo-backup` и добавить в cron:
```bash
0 8 * * * /usr/local/bin/check-duo-backup | mail -s "Duo Backup Status" admin@example.com
```

---

## 🔐 Безопасность бэкапов

### Шифрование бэкапов

```bash
# Зашифровать бэкап
tar -czf - duo-backup-TIMESTAMP/ | gpg --symmetric --cipher-algo AES256 > duo-backup-TIMESTAMP.tar.gz.gpg

# Расшифровать
gpg --decrypt duo-backup-TIMESTAMP.tar.gz.gpg | tar -xz
```

### Права доступа

```bash
# Ограничить доступ к бэкапам
chmod 700 /var/www/duo/backups
chmod 600 /var/www/duo/backups/*
```

---

## 📝 Чек-лист быстрого восстановления

- [ ] Проверить наличие последнего бэкапа
- [ ] Проверить целостность бэкапа (`backup-info.json`)
- [ ] Создать бэкап текущей системы (если нужно)
- [ ] Запустить `restore.js`
- [ ] Выполнить `npm install`
- [ ] Перезапустить PM2
- [ ] Проверить логи
- [ ] Проверить работу сайта
- [ ] Проверить базу данных

---

## 🆘 Troubleshooting

### Ошибка "Database locked"

```bash
# Остановить сервер перед бэкапом
pm2 stop duo-server
node scripts/backup.js
pm2 start duo-server
```

### Недостаточно места

```bash
# Проверить место
df -h

# Очистить старые бэкапы
find /var/www/duo/backups -name "duo-backup-*" -mtime +7 -exec rm -rf {} \;

# Очистить логи PM2
pm2 flush
```

### Битая база данных

```bash
# Проверить целостность
sqlite3 data/database.db "PRAGMA integrity_check;"

# Восстановить из бэкапа
node scripts/restore.js ../backups/duo-backup-TIMESTAMP
```

---

## 📞 Поддержка

При проблемах с бэкапом:
1. Проверить логи: `tail -f /var/log/duo-backup.log`
2. Проверить права доступа: `ls -la backups/`
3. Проверить место на диске: `df -h`
4. Проверить целостность последнего бэкапа

---

*Последнее обновление: 01.01.2026*
