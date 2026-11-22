import { describe, it, expect } from "vitest";
import i18n from "@/i18n/config";
import {
  HELP_LINK_PATTERN,
  getHelpGroups,
  getSectionSearchText,
  normalizeText,
  parseHelpLink,
  stripHelpMarkup,
} from "@/components/help/helpContent";

describe("normalizeText", () => {
  it("pasa a minúsculas y quita tildes", () => {
    expect(normalizeText("Proyección ÚNICO")).toBe("proyeccion unico");
  });
});

const groups = getHelpGroups(i18n.t.bind(i18n));

describe("getHelpGroups", () => {

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

describe("markup de links", () => {
  it("parseHelpLink acepta solo pantallas permitidas y pestañas válidas", () => {
    expect(parseHelpLink("/movements")).toEqual({ to: "/movements" });
    expect(parseHelpLink("/settings?tab=finanzas")).toEqual({ to: "/settings", search: { tab: "finanzas" } });
    expect(parseHelpLink("/settings?tab=otra")).toEqual({ to: "/settings" });
    expect(parseHelpLink("/admin")).toBeNull();
    expect(parseHelpLink("//evil.com")).toBeNull();
    expect(parseHelpLink("https://evil.com")).toBeNull();
  });

  it("stripHelpMarkup deja solo la etiqueta y respeta un token mal formado", () => {
    expect(stripHelpMarkup("Andá a [Ajustes → Mi Workspace](/settings?tab=workspace) ya")).toBe(
      "Andá a Ajustes → Mi Workspace ya",
    );
    expect(stripHelpMarkup("[roto](/settings")).toBe("[roto](/settings");
  });

  it("el texto buscable no incluye el markup y sí la etiqueta visible", () => {
    const invite = groups.flatMap((g) => g.sections).find((s) => s.id === "invitar-miembros")!;
    const text = getSectionSearchText(invite);
    expect(text).not.toContain("](");
    expect(text).toContain("ajustes → mi workspace");
  });

  it("todos los links de la ayuda apuntan a pantallas permitidas (nunca /admin)", () => {
    const all = groups
      .flatMap((g) => g.sections)
      .flatMap((s) => s.content.flatMap((p) => (Array.isArray(p.content) ? p.content : [p.content])));
    const targets = all.flatMap((text) => [...text.matchAll(HELP_LINK_PATTERN)].map((m) => m[2]));
    expect(targets.length).toBeGreaterThan(10);
    targets.forEach((t) => expect(parseHelpLink(t)).not.toBeNull());
  });
});

describe("tips", () => {
  it("hay como mucho 6 tips en toda la ayuda", () => {
    const tips = groups.flatMap((g) => g.sections).flatMap((s) => s.content.filter((p) => p.type === "tip"));
    expect(tips.length).toBeLessThanOrEqual(6);
  });
});
