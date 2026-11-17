import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../contexts/auth-context";
import { authSessionStore } from "../api/client";
import { operationsApi, OperationsSummary } from "../api/operations.api";
export function useOperationsScreen<T>(read: () => Promise<T>) {
  const { user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [summary, setSummary] = useState<OperationsSummary | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    const generation = authSessionStore.currentGeneration();
    setError("");
    setData(null);
    setSummary(null);
    try {
      const caps = await operationsApi.summary();
      const value = await read();
      if (
        request === sequence.current &&
        authSessionStore.isCurrent(generation)
      ) {
        setSummary(caps);
        setData(value);
      }
    } catch (e) {
      if (
        request === sequence.current &&
        authSessionStore.isCurrent(generation)
      )
        setError(
          e instanceof Error
            ? e.message
            : "Business information is unavailable.",
        );
    }
  }, [read, user?.id]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        sequence.current++;
      };
    }, [load]),
  );
  const run = async (action: () => Promise<unknown>) => {
    if (lock.current || !summary) return;
    lock.current = true;
    setBusy(true);
    const generation = authSessionStore.currentGeneration();
    try {
      await operationsApi.summary();
      if (!authSessionStore.isCurrent(generation)) return;
      await action();
      if (authSessionStore.isCurrent(generation)) await load();
    } catch (e) {
      if (authSessionStore.isCurrent(generation)) {
        setSummary(null);setData(null);
        setError(
          e instanceof Error ? e.message : "The change could not be saved.",
        );
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return { data, summary, error, busy, load, run };
}
