"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * Como useActionState, mas enviado via onSubmit: o React 19 limpa formulários
 * que usam a prop `action`, o que apagaria o que o usuário digitou quando a
 * validação falha. Aqui os campos só são limpos se `resetOnSuccess` e ok.
 */
export function useFormAction<S extends { ok?: boolean }>(
  action: (prev: S, formData: FormData) => Promise<S>,
  initial: S,
  { resetOnSuccess = false }: { resetOnSuccess?: boolean } = {},
) {
  type Payload = { data: FormData; form: HTMLFormElement };
  const [state, dispatch, pending] = useActionState<S, Payload>(async (prev, input) => {
    const next = await action(prev, input.data);
    if (resetOnSuccess && next.ok) input.form.reset();
    return next;
  }, initial as Awaited<S>);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    startTransition(() => dispatch({ data, form }));
  }

  return [state, onSubmit, pending] as const;
}
