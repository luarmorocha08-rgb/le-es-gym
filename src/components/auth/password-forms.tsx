"use client";

import { useActionState } from "react";
import { requestPasswordReset, updatePassword, type FormState } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/alert";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";

export function ResetRequestForm({ disabled }: { disabled?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, { status: "idle" });
  if (state.status === "success") return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message && <Alert tone="error">{state.message}</Alert>}
      <FormField
        label="E-mail da conta"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
        disabled={disabled}
      />
      <SubmitButton pending={pending} disabled={disabled}>
        Enviar link
      </SubmitButton>
    </form>
  );
}

export function NewPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updatePassword, { status: "idle" });
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message && <Alert tone="error">{state.message}</Alert>}
      <input type="hidden" name="token" value={token} />
      <FormField
        label="Nova senha"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="Mínimo de 8 caracteres, com letras e números."
        error={state.fieldErrors?.password}
      />
      <FormField
        label="Confirmar nova senha"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirm}
      />
      <SubmitButton pending={pending}>Salvar nova senha</SubmitButton>
    </form>
  );
}
