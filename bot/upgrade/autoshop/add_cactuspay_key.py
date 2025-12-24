#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Скрипт для добавления ключа CactusPay в базу данных
"""
import sqlite3

# Путь к базе данных
DB_PATH = "tgbot/data/database.db"

# ВАШ КЛЮЧ CACTUSPAY
CACTUSPAY_KEY = "589ad2d52decf4bd4b4c1fa7"

def add_cactuspay_key():
    """Добавляет ключ CactusPay в базу данных"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Проверяем текущий ключ
        cursor.execute("SELECT cactuspay_token FROM storage_payment")
        current_key = cursor.fetchone()
        
        print(f"Current CactusPay key: {current_key[0]}")
        
        # Обновляем ключ
        cursor.execute("UPDATE storage_payment SET cactuspay_token = ?", (CACTUSPAY_KEY,))
        conn.commit()
        
        print(f"SUCCESS: CactusPay key updated!")
        print(f"New key: {CACTUSPAY_KEY}")
        
        # Включаем CactusPay (если был выключен)
        cursor.execute("UPDATE storage_payment SET way_cactuspay = 'True'")
        conn.commit()
        
        print("SUCCESS: CactusPay enabled!")
        
        conn.close()
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    print("=" * 50)
    print("Adding CactusPay key")
    print("=" * 50)
    add_cactuspay_key()
    print("=" * 50)
    print("DONE! Now restart the bot:")
    print("python main.py")
    print("=" * 50)
