// 서버 전용: 업로드 파일에서 페이지/슬라이드별 텍스트 추출
import "server-only";
import JSZip from "jszip";
import { extractText, getDocumentProxy } from "unpdf";
import { AppError } from "./claude";
import type { SourcePage } from "./types";

const MIN_TEXT = 15; // 이보다 짧으면 이미지 위주 페이지로 간주

function decodeXml(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

function clean(s: string) {
  return s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

async function parsePdf(buf: ArrayBuffer): Promise<SourcePage[]> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: false });
  return text.map((t, i) => ({ label: `p.${i + 1}`, text: clean(t) }));
}

async function parsePptx(buf: ArrayBuffer): Promise<SourcePage[]> {
  const zip = await JSZip.loadAsync(buf);
  const slides = Object.keys(zip.files)
    .map((name) => ({ name, m: name.match(/^ppt\/slides\/slide(\d+)\.xml$/) }))
    .filter((x) => x.m)
    .map((x) => ({ name: x.name, n: Number(x.m![1]) }))
    .sort((a, b) => a.n - b.n);
  const pages: SourcePage[] = [];
  for (const s of slides) {
    const xml = await zip.file(s.name)!.async("string");
    // 문단(<a:p>) 단위로 텍스트 조각(<a:t>)을 이어 붙인다
    const paras = xml.split(/<\/a:p>/).map((p) =>
      [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decodeXml(m[1])).join(""),
    );
    pages.push({ label: `슬라이드 ${s.n}`, text: clean(paras.filter(Boolean).join("\n")) });
  }
  return pages;
}

function parseTxt(buf: ArrayBuffer): SourcePage[] {
  const text = new TextDecoder("utf-8").decode(buf);
  // 긴 텍스트는 약 3,000자 단위 "구간"으로 나눠 출처를 표시한다
  const paras = text.split(/\n\s*\n/);
  const pages: SourcePage[] = [];
  let cur = "";
  for (const p of paras) {
    if (cur.length + p.length > 3000 && cur) {
      pages.push({ label: `구간 ${pages.length + 1}`, text: clean(cur) });
      cur = "";
    }
    cur += p + "\n\n";
  }
  if (cur.trim()) pages.push({ label: `구간 ${pages.length + 1}`, text: clean(cur) });
  return pages;
}

export async function parseFile(file: File): Promise<{ pages: SourcePage[]; warnings: string[] }> {
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();
  let pages: SourcePage[];
  try {
    if (name.endsWith(".pdf")) pages = await parsePdf(buf);
    else if (name.endsWith(".pptx")) pages = await parsePptx(buf);
    else if (name.endsWith(".txt") || name.endsWith(".md")) pages = parseTxt(buf);
    else if (name.endsWith(".ppt"))
      throw new AppError("UNSUPPORTED", "구버전 .ppt는 지원하지 않습니다. PowerPoint에서 .pptx 또는 PDF로 저장 후 올려주세요.", 415);
    else throw new AppError("UNSUPPORTED", "PDF, PPTX, TXT 파일만 지원합니다.", 415);
  } catch (e) {
    if (e instanceof AppError) throw e;
    console.error(e);
    throw new AppError("PARSE_FAILED", `"${file.name}" 파일을 읽지 못했습니다. 파일이 손상되었거나 암호가 걸려 있을 수 있습니다.`, 422);
  }

  const warnings: string[] = [];
  const empty = pages.filter((p) => p.text.length < MIN_TEXT).map((p) => p.label);
  if (pages.length === 0 || empty.length === pages.length) {
    throw new AppError(
      "NO_TEXT",
      `"${file.name}"에서 텍스트를 찾지 못했습니다. 스캔본·이미지로만 된 자료는 텍스트 추출이 불가능합니다. 텍스트가 포함된 PDF/PPTX를 사용하거나 내용을 TXT로 붙여넣어 주세요.`,
      422,
    );
  }
  if (empty.length) {
    warnings.push(
      `텍스트가 거의 없는 페이지(이미지 위주일 가능성): ${empty.slice(0, 15).join(", ")}${empty.length > 15 ? ` 외 ${empty.length - 15}개` : ""} — 이 부분의 그림·도표 내용은 학습에 반영되지 않습니다.`,
    );
  }
  return { pages: pages.filter((p) => p.text.length >= MIN_TEXT), warnings };
}
