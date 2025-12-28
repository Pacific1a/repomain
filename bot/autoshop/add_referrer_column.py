#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для добавления колонки user_referrer в таблицу storage_users
"""
import sqlite3
import os
import sys

# Добавить путь к модулям бота
sys.path.insert(0, os.path.dirname(__file__))

from tgbot.data.config import PATH_DATABASE

def add_referrer_column():
    """Добавить колонку user_referrer если её ещё нет"""
    try:
        print(f"📂 Путь к БД: {PATH_DATABASE}")
        
        # Проверить существует ли файл
        if not os.path.exists(PATH_DATABASE):
            print(f"❌ Файл БД не найден: {PATH_DATABASE}")
            return False
        
        # Подключиться к БД
        con = sqlite3.connect(PATH_DATABASE)
        cursor = con.cursor()
        
        # Проверить структуру таблицы
        cursor.execute("PRAGMA table_info(storage_users)")
        columns = [col[1] for col in cursor.fetchall()]
        
        print(f"📊 Текущие колонки: {', '.join(columns)}")
        
        if 'user_referrer' in columns:
            print("ℹ️  Колонка user_referrer уже существует!")
            con.close()
            return True
        
        # Добавить колонку
        print("➕ Добавляю колонку user_referrer...")
        cursor.execute("ALTER TABLE storage_users ADD COLUMN user_referrer TEXT DEFAULT NULL")
        con.commit()
        
        # Проверить что колонка добавлена
        cursor.execute("PRAGMA table_info(storage_users)")
        columns_after = [col[1] for col in cursor.fetchall()]
        
        if 'user_referrer' in columns_after:
            print("✅ Колонка user_referrer успешно добавлена!")
            print(f"📊 Колонки после: {', '.join(columns_after)}")
            con.close()
            return True
        else:
            print("❌ Ошибка: колонка не была добавлена")
            con.close()
            return False
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🔧 МИГРАЦИЯ БД: Добавление колонки user_referrer")
    print("=" * 60)
    print()
    
    success = add_referrer_column()
    
    print()
    print("=" * 60)
    if success:
        print("✅ МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!")
    else:
        print("❌ МИГРАЦИЯ ЗАВЕРШЕНА С ОШИБКОЙ!")
    print("=" * 60)
    
    sys.exit(0 if success else 1)
