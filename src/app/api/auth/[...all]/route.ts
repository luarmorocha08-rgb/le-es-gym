import { getAuth } from "@/lib/auth/auth";

function handler(request: Request) {
  const auth = getAuth();
  if (!auth) return Response.json({ error: "Autenticação não configurada." }, { status: 503 });
  return auth.handler(request);
}

export { handler as GET, handler as POST };
