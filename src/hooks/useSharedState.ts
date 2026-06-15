import { useState, useEffect, useRef, useCallback } from "react";
import func2url from "../../backend/func2url.json";

const API = (func2url as Record<string, string>)["app-state"];

// Очередь записи: debounce 800ms, чтобы не флудить запросами
const writeTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const WRITE_DEBOUNCE = 800;

async function remoteGet(key: string): Promise<unknown> {
  const res = await fetch(`${API}?key=${encodeURIComponent(key)}`);
  const data = await res.json();
  return data.value ?? null;
}

async function remoteSet(key: string, value: unknown): Promise<void> {
  await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
}

/**
 * useSharedState — как useState, но данные хранятся на сервере (одинаково на всех устройствах).
 * При первом рендере грузит с сервера, при каждом изменении — сохраняет (с debounce 800ms).
 * Пока данные грузятся — показывает initial (fallback).
 */
export function useSharedState<T>(
  key: string,
  initial: T
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [value, setValueRaw] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);

  // Загрузка при маунте
  useEffect(() => {
    let cancelled = false;
    remoteGet(key).then((remote) => {
      if (cancelled) return;
      if (remote !== null && remote !== undefined) {
        setValueRaw(remote as T);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
    return () => { cancelled = true; };
   
  }, [key]);

  // Сохранение при изменении (пропускаем первый рендер — начальное значение)
  useEffect(() => {
    if (loading) return; // не сохраняем пока не загрузили с сервера
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    // Debounce
    if (writeTimers[key]) clearTimeout(writeTimers[key]);
    writeTimers[key] = setTimeout(() => {
      remoteSet(key, value).catch(() => {/* тихо игнорируем */});
    }, WRITE_DEBOUNCE);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const setValue = useCallback<React.Dispatch<React.SetStateAction<T>>>(
    (action) => setValueRaw(action),
    []
  );

  return [value, setValue, loading];
}
