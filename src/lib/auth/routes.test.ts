import { describe, expect, it } from "vitest";
import { homeForRoles, isProtectedPath, safeNextPath } from "./routes";

describe("safeNextPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeNextPath("/aluno/evolucao")).toBe("/aluno/evolucao");
    expect(safeNextPath("/aluno/treino/123?modo=foco")).toBe("/aluno/treino/123?modo=foco");
  });

  it.each([
    "https://evil.example",
    "//evil.example/x",
    "/\\evil.example",
    "javascript:alert(1)",
    "aluno/dashboard",
    "",
    "/\u0000x",
    "/a".repeat(400),
  ])("bloqueia redirecionamento externo ou inválido: %s", (value) => {
    expect(safeNextPath(value)).toBe("/aluno/dashboard");
  });

  it("usa o fallback informado", () => {
    expect(safeNextPath(undefined, "/admin/dashboard")).toBe("/admin/dashboard");
    expect(safeNextPath(42, "/x")).toBe("/x");
  });
});

describe("homeForRoles", () => {
  it("admin tem prioridade", () => {
    expect(homeForRoles(["aluno", "profissional", "admin"], true)).toBe("/admin/dashboard");
  });
  it("profissional só quando aprovado", () => {
    expect(homeForRoles(["aluno", "profissional"], true)).toBe("/profissional/dashboard");
    expect(homeForRoles(["aluno", "profissional"], false)).toBe("/aluno/dashboard");
  });
  it("aluno por padrão", () => {
    expect(homeForRoles(["aluno"], false)).toBe("/aluno/dashboard");
    expect(homeForRoles([], false)).toBe("/aluno/dashboard");
  });
});

describe("isProtectedPath", () => {
  it("protege as áreas logadas", () => {
    for (const p of ["/aluno", "/aluno/dashboard", "/profissional/alunos/1", "/admin/usuarios"]) {
      expect(isProtectedPath(p)).toBe(true);
    }
  });
  it("não confunde prefixos parecidos nem rotas públicas", () => {
    for (const p of ["/", "/login", "/alunos-famosos", "/administracao", "/equipe"]) {
      expect(isProtectedPath(p)).toBe(false);
    }
  });
});
