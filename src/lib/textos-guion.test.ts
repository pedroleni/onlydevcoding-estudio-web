import { describe, expect, it } from "vitest";

import { valido } from "@/lib/textos-guion";

describe("valido", () => {
  it("rechaza un texto formado solo por espacios", () => {
    expect(valido("   \t  ")).toBe(false);
  });
});
