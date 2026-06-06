import { useState, useEffect, useCallback } from "react";

/**
 * usePersistentState — состояние, которое сохраняется в localStorage.
 * Используется новыми модулями («Продажи», «Услуги», «Школы», файлы), чтобы данные
 * не терялись при перезагрузке/выходе. Структура данных совместима с переносом на бэкенд.
 *
 * Возвращает [value, setValue] как обычный useState.
 */
export function usePersistentState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw) as T;
    } catch {
      /* ignore */
    }
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota errors */
    }
  }, [key, value]);

  return [value, setValue];
}

/** Прочитать значение из localStorage напрямую (для чтения вне React). */
export function readPersistent<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw != null) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

/** Записать значение в localStorage напрямую. */
export function writePersistent<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
