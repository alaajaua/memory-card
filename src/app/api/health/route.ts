import { hasApiKey, MODEL } from "@/lib/claude";

export async function GET() {
  return Response.json({ hasKey: hasApiKey(), model: MODEL });
}
