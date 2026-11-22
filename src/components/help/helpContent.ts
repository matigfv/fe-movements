import type { TFunction } from "i18next";

export interface HelpSection {
  /** Clave i18n (`help.sections.<key>`). */
  key: string;
  /** Id estable usado como ancla (`/help#<id>`). */
  id: string;
  title: string;
  icon: string; // Nombre del icono de Ant Design
  adminOnly: boolean;
  content: HelpParagraph[];
}

export interface HelpGroup {
  key: string;
  title: string;
  sections: HelpSection[];
}

export interface HelpParagraph {
  type: "text" | "list" | "tip";
  content: string | string[];
}

interface SectionDef {
  key: string;
  id: string;
  icon: string;
  adminOnly?: boolean;
  /** Bloques i18n de la sección, en orden: textN, listN o tip. */
  parts: string[];
}

interface GroupDef {
  key: string;
  sections: SectionDef[];
}

const GROUPS: GroupDef[] = [
  {
    key: "start",
    sections: [
      { key: "workspace", id: "workspace", icon: "TeamOutlined", parts: ["text1", "list1", "text2", "list2", "tip"] },
      { key: "invite", id: "invitar-miembros", icon: "UserAddOutlined", parts: ["text1", "list1", "tip"] },
      { key: "roles", id: "roles-y-permisos", icon: "LockOutlined", parts: ["text1", "list1", "text2", "list2", "tip"] },
    ],
  },
  {
    key: "daily",
    sections: [
      { key: "movements", id: "movimientos", icon: "DollarOutlined", parts: ["text1", "list1", "tip"] },
      { key: "import", id: "importar-extracto", icon: "UploadOutlined", parts: ["text1", "list1", "tip"] },
      { key: "export", id: "exportar-movimientos", icon: "DownloadOutlined", parts: ["text1", "list1", "tip"] },
      { key: "services", id: "servicios", icon: "CalendarOutlined", parts: ["text1", "list1", "tip"] },
      { key: "income", id: "ingresos", icon: "WalletOutlined", parts: ["text1", "list1", "tip"] },
    ],
  },
  {
    key: "planning",
    sections: [
      { key: "budgets", id: "presupuestos", icon: "FundOutlined", parts: ["text1", "list1", "tip"] },
      { key: "goals", id: "metas-de-ahorro", icon: "TrophyOutlined", parts: ["text1", "list1"] },
      { key: "dashboard", id: "dashboard", icon: "PieChartOutlined", parts: ["text1", "list1"] },
      { key: "insights", id: "insights-racha-proyeccion", icon: "LineChartOutlined", parts: ["text1", "list1"] },
      { key: "utilities", id: "utilidades", icon: "CalculatorOutlined", parts: ["text1", "list1", "tip"] },
    ],
  },
  {
    key: "account",
    sections: [
      { key: "settings", id: "ajustes", icon: "SettingOutlined", parts: ["text1", "list1", "tip"] },
      { key: "admin", id: "administracion", icon: "SafetyOutlined", adminOnly: true, parts: ["text1", "list1"] },
    ],
  },
];

const toParagraph = (t: TFunction, base: string, part: string): HelpParagraph => {
  const key = `${base}.${part}`;
  if (part.startsWith("list")) return { type: "list", content: t(key, { returnObjects: true }) as string[] };
  return { type: part === "tip" ? "tip" : "text", content: t(key) };
};

// El contenido se genera a partir de las claves i18n `help.groups.*` y `help.sections.*` para
// poder traducirse. Ver src/components/help/HelpPage.tsx para el uso con useTranslation().
export const getHelpGroups = (t: TFunction): HelpGroup[] =>
  GROUPS.map((group) => ({
    key: group.key,
    title: t(`help.groups.${group.key}`),
    sections: group.sections.map((def) => {
      const base = `help.sections.${def.key}`;
      return {
        key: def.key,
        id: def.id,
        title: t(`${base}.title`),
        icon: def.icon,
        adminOnly: def.adminOnly ?? false,
        content: def.parts.map((part) => toParagraph(t, base, part)),
      };
    }),
  }));

/** Minúsculas y sin tildes, para comparar texto en la búsqueda. */
export const normalizeText = (value: string): string =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Todo el texto buscable de una sección: título y cuerpo. */
export const getSectionSearchText = (section: HelpSection): string =>
  normalizeText(
    [section.title, ...section.content.flatMap((p) => (Array.isArray(p.content) ? p.content : [p.content]))].join(" "),
  );
