"use client";

import { BookCopy, ClipboardCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { adjustForStudent, generateForStudent, saveAiDraft } from "@/app/profissional/_actions/ai";
import type { SuggestionPayload } from "@/app/aluno/_actions/ai";
import { RevoMark } from "@/components/brand/emblem";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GOAL_LABELS, GOALS, LEVEL_LABELS, LEVELS } from "@/lib/workout/constants";
import { AdjustPanel } from "./adjust-panel";
import { AiThinking } from "./ai-thinking";
import { SuggestionView } from "./suggestion-view";
import type { AssistantDefaults } from "./student-assistant";

const PRESETS = [
  "Reduzir o volume",
  "Aumentar o volume",
  "Alterar a divisão para ABC",
  "Alterar a divisão para Upper / Lower",
  "Trocar exercícios livres por máquinas",
  "Incluir mais trabalho de core",
];

const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

export function TrainerAssistant({ studentId, studentName, defaults }: { studentId: string; studentName: string; defaults: AssistantDefaults }) {
  const [form, setForm] = useState({
    goal: defaults.goal ?? "",
    level: defaults.level ?? "",
    daysPerWeek: String(defaults.daysPerWeek ?? 3),
    sessionMinutes: String(defaults.sessionMinutes ?? 60),
    equipment: defaults.equipment.join(", "),
    priorityMuscles: defaults.priorityMuscles.join(", "),
    limitations: defaults.limitations ?? "",
    avoid: defaults.avoid ?? "",
    preferences: defaults.preferences ?? "",
    extraInstructions: "",
  });
  const [history, setHistory] = useState<SuggestionPayload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [saving, startSave] = useTransition();
  const current = history[history.length - 1] ?? null;
  const previous = history.length > 1 ? history[history.length - 2] : null;
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function generate() {
    setError(null);
    start(async () => {
      const r = await generateForStudent(studentId, {
        ...form,
        equipment: list(form.equipment),
        priorityMuscles: list(form.priorityMuscles),
      });
      if (r.ok) setHistory([r.data]);
      else setError(r.message);
    });
  }

  function adjust(instruction: string) {
    if (!current) return;
    setError(null);
    start(async () => {
      const r = await adjustForStudent(current.generationId, instruction);
      if (r.ok) setHistory((h) => [...h, r.data]);
      else setError(r.message);
    });
  }

  function save(asTemplate: boolean) {
    if (!current) return;
    startSave(async () => {
      const r = await saveAiDraft(current.generationId, asTemplate);
      if (r && !r.ok) setError(r.message);
    });
  }

  if (pending && !current) return <AiThinking steps={[`Analisando os dados de ${studentName.split(" ")[0]}…`, "Considerando histórico e restrições…", "Estruturando a ficha…"]} />;

  if (current) {
    return (
      <div className="space-y-6">
        {error && <Alert tone="error">{error}</Alert>}
        <div style={{ opacity: pending ? 0.4 : 1 }}>
          <SuggestionView suggestion={current.suggestion} audience="profissional" />
        </div>
        {pending && <AiThinking steps={["Aplicando o ajuste…", "Revisando a ficha…"]} />}
        <AdjustPanel presets={PRESETS} onAdjust={adjust} pending={pending} previous={previous?.suggestion ?? null} current={current.suggestion} />
        <Alert title="A sugestão não será publicada automaticamente">
          Salvar cria um rascunho. Na página da ficha você revisa, edita (inclusive trocando exercícios), compara e decide se publica.
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" disabled={saving} onClick={() => save(false)}>
            <ClipboardCheck /> Salvar como rascunho para {studentName.split(" ")[0]}
          </Button>
          <Button size="lg" variant="outline" disabled={saving} onClick={() => save(true)}>
            <BookCopy /> Salvar como modelo
          </Button>
          <Button size="lg" variant="ghost" onClick={() => setHistory([])}>
            Gerar outra
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        generate();
      }}
    >
      <p className="text-sm text-white/60">
        Dados autorizados de <strong className="text-white">{studentName}</strong> (perfil e saúde declarada). Ajuste se necessário — apenas
        estes campos e o histórico de cargas são enviados, sem nome ou contato.
      </p>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field id="ai-goal" label="Objetivo">
          <Select id="ai-goal" value={form.goal} onChange={set("goal")} required>
            <option value="" disabled>
              Escolha
            </option>
            {GOALS.map((g) => (
              <option key={g} value={g}>
                {GOAL_LABELS[g]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="ai-level" label="Experiência">
          <Select id="ai-level" value={form.level} onChange={set("level")} required>
            <option value="" disabled>
              Escolha
            </option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABELS[l]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="ai-days" label="Dias/semana">
          <Select id="ai-days" value={form.daysPerWeek} onChange={set("daysPerWeek")}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="ai-min" label="Min/treino">
          <Select id="ai-min" value={form.sessionMinutes} onChange={set("sessionMinutes")}>
            {[30, 45, 60, 75, 90, 120].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ai-eq" label="Equipamentos" hint="Vazio = academia completa. Separe por vírgulas.">
          <Input id="ai-eq" value={form.equipment} onChange={set("equipment")} />
        </Field>
        <Field id="ai-mus" label="Prioridades musculares" hint="Separe por vírgulas.">
          <Input id="ai-mus" value={form.priorityMuscles} onChange={set("priorityMuscles")} />
        </Field>
        <Field id="ai-lim" label="Limitações declaradas">
          <Textarea id="ai-lim" value={form.limitations} onChange={set("limitations")} maxLength={800} className="min-h-20" />
        </Field>
        <Field id="ai-avoid" label="Evitar">
          <Textarea id="ai-avoid" value={form.avoid} onChange={set("avoid")} maxLength={400} className="min-h-20" />
        </Field>
        <Field id="ai-pref" label="Preferências">
          <Textarea id="ai-pref" value={form.preferences} onChange={set("preferences")} maxLength={600} className="min-h-20" />
        </Field>
        <Field id="ai-extra" label="Orientações suas para a IA" hint="Ex.: priorizar unilaterais, evitar agachamento livre por enquanto.">
          <Textarea id="ai-extra" value={form.extraInstructions} onChange={set("extraInstructions")} maxLength={600} className="min-h-20" />
        </Field>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" size="lg" disabled={pending || !form.goal || !form.level}>
        <RevoMark className="size-5" /> Gerar sugestão de treino com IA
      </Button>
    </form>
  );
}
