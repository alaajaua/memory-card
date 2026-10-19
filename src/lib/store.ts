"use client";
// 브라우저 IndexedDB에 학습 세트를 저장 (새로고침해도 유지)
import { del, get, keys, set } from "idb-keyval";
import { useCallback, useEffect, useState } from "react";
import type { StudySet } from "./types";

const PREFIX = "studyset:";

export const timestamp = () => Date.now();

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function listSets(): Promise<StudySet[]> {
  const ks = (await keys()).filter((k) => String(k).startsWith(PREFIX));
  const sets = await Promise.all(ks.map((k) => get<StudySet>(k)));
  return sets.filter((s): s is StudySet => Boolean(s)).sort((a, b) => b.updatedAt - a.updatedAt);
}

export const loadSet = (id: string) => get<StudySet>(PREFIX + id);
export const saveSet = (s: StudySet) => set(PREFIX + s.id, s);
export const deleteSet = (id: string) => del(PREFIX + id);

/** 학습 세트를 읽고, 변경 시 자동 저장하는 훅 */
export function useStudySet(id: string) {
  const [data, setData] = useState<StudySet | null | undefined>(undefined);

  useEffect(() => {
    loadSet(id).then((s) => setData(s ?? null));
  }, [id]);

  const update = useCallback((fn: (s: StudySet) => StudySet) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = { ...fn(prev), updatedAt: Date.now() };
      saveSet(next);
      return next;
    });
  }, []);

  return { set: data, update };
}
