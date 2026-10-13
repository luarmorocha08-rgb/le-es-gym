// Servidor HTTP que imita a Messages API da Anthropic, usado SOMENTE nos testes
// e2e (E2E_AI_MOCK=1). O app em teste aponta para ele via ANTHROPIC_BASE_URL.
// Nada disso existe no código da aplicação: sem chave real, o app mostra
// "configuração pendente" e não simula respostas.
import http from "node:http";

const port = Number(process.env.MOCK_ANTHROPIC_PORT ?? 3299);
const requests = [];

const suggestion = (adjusted) => ({
  title: adjusted ? "Hipertrofia ABC — ajustado" : "Hipertrofia ABC",
  split_type: "ABC",
  summary: "Divisão em três dias com foco em grandes grupos musculares.",
  weekly_schedule: "Seg A, Qua B, Sex C; descanso nos demais dias.",
  days: [
    {
      label: "A",
      name: "Peito e tríceps",
      exercises: [
        { slug: "supino-reto-barra", sets: 4, reps: "8-10", rest_seconds: 90, notes: null },
        { slug: "crucifixo-halteres", sets: 3, reps: "10-12", rest_seconds: 60, notes: "Amplitude controlada" },
        { slug: "triceps-corda", sets: 3, reps: "12", rest_seconds: 60, notes: null },
        // fora do catálogo: o app deve descartar
        { slug: "exercicio-inventado", sets: 3, reps: "10", rest_seconds: 60, notes: null },
      ],
    },
    {
      label: "B",
      name: "Costas e bíceps",
      exercises: [
        { slug: "puxada-frente-polia", sets: 4, reps: "8-12", rest_seconds: 90, notes: null },
        { slug: adjusted ? "remada-baixa-polia" : "remada-curvada-barra", sets: 3, reps: "10", rest_seconds: 90, notes: null },
        { slug: "rosca-direta-barra", sets: 3, reps: "10-12", rest_seconds: 60, notes: null },
      ],
    },
    {
      label: "C",
      name: "Pernas e ombros",
      exercises: [
        { slug: "leg-press-45", sets: 4, reps: "10-12", rest_seconds: 90, notes: null },
        { slug: "cadeira-extensora", sets: 3, reps: "12", rest_seconds: 60, notes: null },
        { slug: "elevacao-lateral", sets: 3, reps: "12-15", rest_seconds: 60, notes: null },
      ],
    },
  ],
  progression: "Aumente a carga quando completar todas as repetições com boa técnica.",
  general_tips: ["Aqueça antes de começar."],
  safety_notes: ["Interrompa em caso de dor."],
  requires_professional_evaluation: false,
});

function outputFor(body) {
  const props = Object.keys(body.output_config?.format?.schema?.properties ?? {});
  const userText = JSON.stringify(body.messages ?? []);
  if (props.includes("options")) {
    return {
      options: [
        { slug: "supino-reto-halteres", reason: "Mesmo padrão de empurrar com maior amplitude." },
        { slug: "flexao-de-bracos", reason: "Alternativa sem equipamento." },
      ],
    };
  }
  if (props.includes("answer")) {
    return { answer: "Mantenha as escápulas retraídas e controle a descida.", safety_note: null };
  }
  return suggestion(userText.includes("Pedido de ajuste:"));
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/__requests") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(requests));
    return;
  }
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200);
    res.end("ok");
    return;
  }
  if (req.method === "POST" && req.url?.startsWith("/v1/messages")) {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw);
      requests.push(body);
      const output = outputFor(body);
      res.writeHead(200, { "content-type": "application/json", "request-id": `req_mock_${requests.length}` });
      res.end(
        JSON.stringify({
          id: `msg_mock_${requests.length}`,
          type: "message",
          role: "assistant",
          model: body.model,
          content: [{ type: "text", text: JSON.stringify(output) }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 1200, output_tokens: 600, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
        }),
      );
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(port, "127.0.0.1", () => console.log(`mock anthropic em http://127.0.0.1:${port}`));
