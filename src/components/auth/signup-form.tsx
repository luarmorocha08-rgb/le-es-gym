"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signup, type FormState } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";

export function SignupForm({ defaultProfessional, disabled }: { defaultProfessional?: boolean; disabled?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signup, { status: "idle" });
  const [pro, setPro] = useState(Boolean(defaultProfessional));

  if (state.status === "success") {
    return (
      <Alert tone="success" title="Quase lá!">
        <p>{state.message}</p>
        {pro && <p>Seu cadastro profissional será analisado pela administração da academia após a confirmação.</p>}
      </Alert>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message && <Alert tone="error">{state.message}</Alert>}
      <FormField
        label="Nome completo"
        name="fullName"
        autoComplete="name"
        required
        defaultValue={state.values?.fullName}
        error={state.fieldErrors?.fullName}
        disabled={disabled}
      />
      <FormField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
        disabled={disabled}
      />
      <FormField
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="Mínimo de 8 caracteres, com letras e números."
        error={state.fieldErrors?.password}
        disabled={disabled}
      />

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <label className="flex cursor-pointer gap-3 text-sm text-white/80">
          <Checkbox
            name="wantsProfessional"
            checked={pro}
            onChange={(e) => setPro(e.target.checked)}
            disabled={disabled}
          />
          <span>
            Sou profissional de educação física e quero atuar na plataforma.
            <span className="mt-1 block text-xs text-white/45">
              Seu acesso como profissional será liberado somente após aprovação da administração. Até lá, você usa a
              conta como aluno.
            </span>
          </span>
        </label>
        {pro && (
          <div className="mt-4">
            <FormField
              label="Registro CREF"
              name="cref"
              placeholder="000000-G/SP"
              required
              defaultValue={state.values?.cref}
              error={state.fieldErrors?.cref}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      <div>
        <label className="flex cursor-pointer gap-3 text-sm text-white/70">
          <Checkbox name="terms" required aria-invalid={state.fieldErrors?.terms ? true : undefined} disabled={disabled} />
          <span>
            Li e aceito a{" "}
            <Link href="/privacidade" target="_blank" className="text-white underline underline-offset-4">
              política de privacidade
            </Link>{" "}
            e o tratamento dos meus dados para uso da plataforma.
          </span>
        </label>
        {state.fieldErrors?.terms && (
          <p className="mt-2 text-xs text-[var(--color-danger)]" role="alert">
            {state.fieldErrors.terms}
          </p>
        )}
      </div>

      <SubmitButton pending={pending} disabled={disabled}>
        Criar conta
      </SubmitButton>
    </form>
  );
}
