// 긴 자료를 AI가 처리하기 좋은 크기의 구간으로 나눈다
import type { Material } from "./types";

const CHUNK_CHARS = 30000;

export interface Chunk {
  text: string;
  label: string; // 예: "운영체제 1강 p.1~p.24"
}

export function buildChunks(materials: Material[]): Chunk[] {
  const chunks: Chunk[] = [];
  for (const m of materials) {
    let buf: string[] = [];
    let size = 0;
    let first = "";
    let last = "";
    const flush = () => {
      if (!buf.length) return;
      chunks.push({ text: buf.join("\n\n"), label: `${m.lecture} ${first}${first !== last ? `~${last}` : ""}` });
      buf = [];
      size = 0;
    };
    for (const p of m.pages) {
      const block = `[${m.lecture} | ${p.label}]\n${p.text}`;
      if (size + block.length > CHUNK_CHARS && buf.length) flush();
      if (!buf.length) first = p.label;
      buf.push(block.slice(0, CHUNK_CHARS));
      size += block.length;
      last = p.label;
    }
    flush();
  }
  return chunks;
}
