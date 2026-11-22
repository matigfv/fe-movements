import { Link } from "@tanstack/react-router";
import { theme } from "antd";
import type { ReactNode } from "react";
import { HELP_LINK_PATTERN, parseHelpLink } from "@/components/help/helpContent";

/** Renderiza `[etiqueta](/ruta)` como link interno; todo lo demás (o una ruta no permitida) queda como texto. */
export function HelpRichText({ text }: { text: string }) {
  const { token } = theme.useToken();
  const nodes: ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(HELP_LINK_PATTERN)) {
    const [raw, label, target] = match;
    const link = parseHelpLink(target);
    nodes.push(text.slice(last, match.index));
    last = match.index + raw.length;
    if (!link) {
      nodes.push(label);
      continue;
    }
    const style = { color: token.colorLink, textDecoration: "underline" };
    nodes.push(
      link.to === "/settings" ? (
        <Link key={match.index} to="/settings" search={link.search} style={style}>
          {label}
        </Link>
      ) : (
        <Link key={match.index} to={link.to} style={style}>
          {label}
        </Link>
      ),
    );
  }
  nodes.push(text.slice(last));

  return <>{nodes}</>;
}
