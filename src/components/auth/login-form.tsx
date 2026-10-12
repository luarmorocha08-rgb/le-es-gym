"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type FormState } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/alert";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";

export function LoginForm({ next, disabled }: { next?: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, { status: "idle" });
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message && <Alert tone="error">{state.message}</Alert>}
      {next && <input type="hidden" name="next" value={next} />}
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
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
        disabled={disabled}
      />
      <div className="flex justify-end">
        <Link href="/recuperar-senha" className="text-sm text-white/60 underline-offset-4 hover:text-white hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      <SubmitButton pending={pending} disabled={disabled}>
        Entrar
      </SubmitButton>
    </form>
  );
}
