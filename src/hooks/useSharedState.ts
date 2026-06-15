import { useState, useEffect, useRef } from "react";
import func2url from "../../backend/func2url.json";

const API = (func2url as Record<string, string>)["app-state"];

// Глобальный кэш в памяти — чтобы несколько компонентов с одним ключом не дублировали запросы
const memCache: Record<string, unknown> = {};
const pendingFetches: Record<string, Promise<unknown>> = {};

// Debounce-таймеры для записи
const writeTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function lsGet(key: string): unknown {
  try { const r = localStorage.getItem("ss_" + key); return r ? JSON.parse(r) : null; } catch { return null; }
}
function lsSet(key: string, v: unknown) {
  try { localStorage.setItem("ss_" + key, JSON.stringify(v)); } catch { /* ignore */ }
}

function fetchRemote(key: string): Promise<unknown> {
  if (pendingFetches[key]) return pendingFetches[key];
  const p = fetch(`${API}?key=${encodeURIComponent(key)}`)
    .then(r => r.json())
    .then(d => { const v = d.value ?? null; if (v !== null) { memCache[key] = v; lsSet(key, v); } return v; })
    .catch(() => null)
    .finally(() => { delete pendingFetches[key]; });
  pendingFetches[key] = p;
  return p;
}

function saveRemote(key: string, value: unknown) {
  if (writeTimers[key]) clearTimeout(writeTimers[key]);
  writeTimers[key] = setTimeout(() => {
    lsSet(key, value); // сразу в кэш
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    }).catch(() => {/* не падаем */});
  }, 600);
}

/**
 * useSharedState — данные одинаковы на всех устройствах.
 * 1) Сразу отдаёт данные из localStorage (instant)
 * 2) Догружает с сервера и обновляет
 * 3) При изменении — сохраняет на сервер (debounce 600ms)
 */
export function useSharedState<T>(
  key: string,
  initial: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Начальное значение: память → localStorage → initial
  const getInitial = (): T => {
    if (memCache[key] !== undefined) return memCache[key] as T;
    const ls = lsGet(key);
    if (ls !== null) { memCache[key] = ls; return ls as T; }
    return initial;
  };

  const [value, setValueRaw] = useState<T>(getInitial);
  const initialized = useRef(false);
  const savedValue = useRef(value);

  // Загрузка с сервера один раз при маунте
  useEffect(() => {
    fetchRemote(key).then(remote => {
      if (remote !== null && remote !== undefined) {
        setValueRaw(remote as T);
        savedValue.current = remote as T;
      }
    });
     
  }, [key]);

  // Сохранение при изменении (только не при первом рендере)
  useEffect(() => {
    if (!initialized.current) { initialized.current = true; return; }
    if (JSON.stringify(value) === JSON.stringify(savedValue.current)) return;
    savedValue.current = value;
    memCache[key] = value;
    saveRemote(key, value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return [value, setValueRaw];
}
