import QuestionCircleOutlined from "@ant-design/icons/QuestionCircleOutlined";
import { Tooltip, theme } from "antd";
import { useTranslation } from "react-i18next";

const TOPICS = {
  import: "importar-extracto",
  invite: "invitar-miembros",
  goals: "metas-de-ahorro",
} as const;

/**
 * Ayuda contextual: abre la sección en una pestaña nueva para no perder lo que se está
 * completando en un modal o formulario. Es un <a> común, así que no necesita contexto de router.
 */
export function HelpLink({ topic }: { topic: keyof typeof TOPICS }) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const label = t(`help.link.${topic}`);

  return (
    <Tooltip title={label}>
      <a
        href={`/help#${TOPICS[topic]}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        style={{ color: token.colorTextSecondary, fontSize: token.fontSizeLG, lineHeight: 1 }}
      >
        <QuestionCircleOutlined />
      </a>
    </Tooltip>
  );
}
