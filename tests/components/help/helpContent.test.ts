import { describe, it, expect } from "vitest";
import i18n from "@/i18n/config";
import { getHelpGroups, getSectionSearchText, normalizeText } from "@/components/help/helpContent";

describe("normalizeText", () => {
  it("pasa a minúsculas y quita tildes", () => {
    expect(normalizeText("Proyección ÚNICO")).toBe("proyeccion unico");
  });
});

describe("getHelpGroups", () => {
  const groups = getHelpGroups(i18n.t.bind(i18n));

  it("define cuatro grupos con ids de sección únicos", () => {
    expect(groups.map((g) => g.key)).toEqual(["start", "daily", "planning", "account"]);
    const ids = groups.flatMap((g) => g.sections.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("solo la sección de administración es adminOnly", () => {
    const adminOnly = groups.flatMap((g) => g.sections).filter((s) => s.adminOnly);
    expect(adminOnly.map((s) => s.id)).toEqual(["administracion"]);
  });

  it("el texto buscable incluye título y cuerpo normalizados", () => {
    const section = groups.flatMap((g) => g.sections).find((s) => s.id === "importar-extracto")!;
    const text = getSectionSearchText(section);
    expect(text).toContain("importar el extracto del banco");
    expect(text).toContain("santander");
  });
});
