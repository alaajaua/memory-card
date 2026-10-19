"use client";
// 서버 API 호출 (오류 메시지를 사용자에게 보여줄 수 있게 정리)

export class ClientError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ClientError(`서버 응답을 읽지 못했습니다 (HTTP ${res.status}).`);
  }
  if (!res.ok) {
    const d = data as { error?: string; code?: string };
    throw new ClientError(d.error ?? `요청 실패 (HTTP ${res.status})`, d.code);
  }
  return data as T;
}

export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new ClientError("서버에 연결하지 못했습니다. 개발 서버가 실행 중인지 확인하세요.");
  }
  return handle<T>(res);
}

export async function uploadFile<T>(url: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", body: form });
  } catch {
    throw new ClientError("서버에 연결하지 못했습니다.");
  }
  return handle<T>(res);
}
