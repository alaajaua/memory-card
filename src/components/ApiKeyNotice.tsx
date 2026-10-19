"use client";
import { useEffect, useState } from "react";

/** 서버에 API Key가 없으면 설정 방법을 안내한다 */
export default function ApiKeyNotice() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setHasKey(Boolean(d.hasKey)))
      .catch(() => setHasKey(null));
  }, []);
  if (hasKey !== false) return null;
  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Anthropic API Key 설정이 필요합니다</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>
          <a className="underline" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>
          에서 API Key를 발급합니다.
        </li>
        <li>
          프로젝트 루트에 <code className="rounded bg-amber-100 px-1">.env.local</code> 파일을 만들고{" "}
          <code className="rounded bg-amber-100 px-1">ANTHROPIC_API_KEY=발급받은키</code> 를 적습니다.
        </li>
        <li>개발 서버(npm run dev)를 다시 시작합니다.</li>
      </ol>
      <p className="mt-2 text-amber-800">키는 서버에서만 사용되며 브라우저에 노출되지 않습니다. AI 분석·문제 생성·채점 시 API 사용 요금이 발생합니다.</p>
    </div>
  );
}
