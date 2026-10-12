import { describe, expect, it } from "vitest";
import { loginSchema, newPasswordSchema, signupSchema, toFieldErrors } from "./auth";

const valid = {
  fullName: "Maria da Silva",
  email: "  Maria@Exemplo.com ",
  password: "treino123",
  terms: "on",
};

describe("signupSchema", () => {
  it("normaliza e aceita um cadastro válido de aluno", () => {
    const r = signupSchema.parse(valid);
    expect(r.email).toBe("maria@exemplo.com");
    expect(r.wantsProfessional).toBe(false);
    expect(r.terms).toBe(true);
  });

  it("exige aceite dos termos", () => {
    const r = signupSchema.safeParse({ ...valid, terms: undefined });
    expect(r.success).toBe(false);
    if (!r.success) expect(toFieldErrors(r.error).terms).toMatch(/aceitar/);
  });

  it("exige CREF para cadastro profissional", () => {
    const r = signupSchema.safeParse({ ...valid, wantsProfessional: "on", cref: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(toFieldErrors(r.error).cref).toBeDefined();
    expect(signupSchema.safeParse({ ...valid, wantsProfessional: "on", cref: "123456-G/SP" }).success).toBe(true);
  });

  it("não aceita papel enviado pelo formulário", () => {
    const r = signupSchema.parse({ ...valid, role: "admin" });
    expect(r).not.toHaveProperty("role");
  });

  it.each(["curta1", "somenteletras", "12345678"])("rejeita senha fraca: %s", (password) => {
    expect(signupSchema.safeParse({ ...valid, password }).success).toBe(false);
  });

  it("rejeita nome com caracteres inválidos e aceita acentos", () => {
    expect(signupSchema.safeParse({ ...valid, fullName: "<script>" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...valid, fullName: "João Ávila D'Ângelo" }).success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("valida e-mail", () => {
    expect(loginSchema.safeParse({ email: "x", password: "a" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "a" }).success).toBe(true);
  });
});

describe("newPasswordSchema", () => {
  it("exige confirmação idêntica", () => {
    const r = newPasswordSchema.safeParse({ password: "treino123", confirm: "treino124" });
    expect(r.success).toBe(false);
    if (!r.success) expect(toFieldErrors(r.error).confirm).toMatch(/coincidem/);
  });
});
