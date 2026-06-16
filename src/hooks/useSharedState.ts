import { useState, useEffect, useRef, useCallback } from "react";
import func2url from "../../backend/func2url.json";

const API = (func2url as Record<string, string>)["app-state"];
const POLL_INTERVAL = 10_000;
const LS_VERSION = "v4";

// Сбрасываем старый кэш браузера
(function clearOldCache() {
  try {
    if (localStorage.getItem("ss_cache_version") !== LS_VERSION) {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith("ss_")) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
      localStorage.setItem("ss_cache_version", LS_VERSION);
    }
  } catch { /* ignore */ }
})();

// Глобальные структуры — один экземпляр на приложение
const memCache: Record<string, unknown> = {};
const loadedFromServer: Record<string, boolean> = {}; // ключ загружен с сервера хотя бы раз
const subscribers: Record<string, Set<(v: unknown) => void>> = {};
const saveTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const pollTimers: Record<string, ReturnType<typeof setInterval>> = {};
const pollCount: Record<string, number> = {};

function lsGet(key: string): unknown {
  try { const r = localStorage.getItem("ss_" + key); return r ? JSON.parse(r) : null; } catch { return null; }
}
function lsSet(key: string, v: unknown) {
  try { localStorage.setItem("ss_" + key, JSON.stringify(v)); } catch { /* ignore */ }
}

async function serverGet(key: string): Promise<unknown> {
  try {
    const r = await fetch(`${API}?key=${encodeURIComponent(key)}`);
    const d = await r.json();
    return d.value ?? null;
  } catch { return null; }
}

function serverSet(key: string, value: unknown) {
  fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  }).catch(() => {/* ignore */});
}

function broadcast(key: string, value: unknown) {
  subscribers[key]?.forEach(fn => fn(value));
}

function scheduleWrite(key: string, value: unknown) {
  if (saveTimers[key]) clearTimeout(saveTimers[key]);
  saveTimers[key] = setTimeout(() => {
    lsSet(key, value);
    serverSet(key, value);
  }, 400);
}

function startPoll(key: string) {
  pollCount[key] = (pollCount[key] || 0) + 1;
  if (pollTimers[key]) return;
  pollTimers[key] = setInterval(async () => {
    const remote = await serverGet(key);
    if (remote === null) return;
    const curr = JSON.stringify(memCache[key]);
    const next = JSON.stringify(remote);
    if (curr !== next) {
      memCache[key] = remote;
      lsSet(key, remote);
      broadcast(key, remote);
    }
  }, POLL_INTERVAL);
}

function stopPoll(key: string) {
  pollCount[key] = Math.max(0, (pollCount[key] || 1) - 1);
  if (pollCount[key] === 0 && pollTimers[key]) {
    clearInterval(pollTimers[key]);
    delete pollTimers[key];
  }
}

/**
 * useSharedState — общее состояние для всех устройств.
 *
 * Гарантии:
 * 1. Мгновенный старт: берёт из памяти → localStorage → initial
 * 2. При маунте: загружает с сервера и применяет
 * 3. Polling 10с: видим чужие изменения
 * 4. При setValue: сразу меняет локально + пишет на сервер через 400ms
 */
export function useSharedState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  // Начальное значение: память → localStorage → initial
  const init = (): T => {
    if (key === "__none__") return initial;
    if (memCache[key] !== undefined) return memCache[key] as T;
    const ls = lsGet(key);
    if (ls !== null) { memCache[key] = ls; return ls as T; }
    return initial;
  };

  const [value, setLocal] = useState<T>(init);
  const serverLoadedRef = useRef(false); // флаг: данные с сервера уже получены

  // Подписка на polling-обновления
  useEffect(() => {
    if (key === "__none__") return;
    if (!subscribers[key]) subscribers[key] = new Set();
    const handler = (v: unknown) => setLocal(v as T);
    subscribers[key].add(handler);
    return () => { subscribers[key].delete(handler); };
  }, [key]);

  // Загрузка с сервера + polling
  useEffect(() => {
    if (key === "__none__") return;
    startPoll(key);

    if (!loadedFromServer[key]) {
      serverGet(key).then(remote => {
        loadedFromServer[key] = true;
        serverLoadedRef.current = true;

        if (remote !== null && remote !== undefined) {
          // Сервер вернул данные — применяем
          memCache[key] = remote;
          lsSet(key, remote);
          setLocal(remote as T);
        } else {
          // Сервер пустой — записываем текущее значение (initial или из localStorage)
          const cur = memCache[key] !== undefined ? memCache[key] : initial;
          memCache[key] = cur;
          lsSet(key, cur);
          serverSet(key, cur); // пишем начальное значение в БД
        }
      });
    } else {
      serverLoadedRef.current = true;
    }

    return () => { stopPoll(key); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Setter — сохраняет на сервер сразу при изменении
  const setValue = useCallback((action: T | ((prev: T) => T)) => {
    setLocal(prev => {
      const next = typeof action === "function" ? (action as (p: T) => T)(prev) : action;
      // Записываем в глобальный кэш
      memCache[key] = next;
      // Если уже загрузили с сервера — пишем обратно
      if (serverLoadedRef.current || loadedFromServer[key]) {
        scheduleWrite(key, next);
      } else {
        // Ещё не загрузили — отложим запись до загрузки
        const check = setInterval(() => {
          if (loadedFromServer[key]) {
            clearInterval(check);
            scheduleWrite(key, memCache[key]);
          }
        }, 100);
        setTimeout(() => clearInterval(check), 5000); // на случай если никогда
      }
      return next;
    });
   
  }, [key]);

  return [value, setValue];
}
