import { errorResponse, AppError } from "@/lib/claude";
import { parseFile } from "@/lib/parse";

export const maxDuration = 60;
const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("NO_FILE", "파일이 없습니다.", 400);
    if (file.size > MAX_BYTES) throw new AppError("TOO_LARGE", "파일이 너무 큽니다(최대 50MB).", 413);
    const result = await parseFile(file);
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
