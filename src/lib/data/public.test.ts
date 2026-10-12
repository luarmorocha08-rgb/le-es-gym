import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { groupHoursByDay } = await import("./public");

describe("groupHoursByDay", () => {
  it("agrupa por dia na ordem seg→dom e formata HH:MM", () => {
    const days = groupHoursByDay([
      { weekday: 0, opens_at: "08:00:00", closes_at: "12:00:00", note: null },
      { weekday: 1, opens_at: "17:00:00", closes_at: "22:00:00", note: null },
      { weekday: 1, opens_at: "06:00:00", closes_at: "12:00:00", note: "manhã" },
    ]);
    expect(days.map((d) => d.label)).toEqual(["Segunda", "Domingo"]);
    expect(days[0].ranges[1]).toEqual({ from: "06:00", to: "12:00", note: "manhã" });
  });

  it("omite dias sem horário cadastrado", () => {
    expect(groupHoursByDay([])).toEqual([]);
  });
});
