import CalculatorOutlined from "@ant-design/icons/CalculatorOutlined";
import CalendarOutlined from "@ant-design/icons/CalendarOutlined";
import DollarOutlined from "@ant-design/icons/DollarOutlined";
import DownloadOutlined from "@ant-design/icons/DownloadOutlined";
import FundOutlined from "@ant-design/icons/FundOutlined";
import InfoCircleOutlined from "@ant-design/icons/InfoCircleOutlined";
import LineChartOutlined from "@ant-design/icons/LineChartOutlined";
import LockOutlined from "@ant-design/icons/LockOutlined";
import PieChartOutlined from "@ant-design/icons/PieChartOutlined";
import QuestionCircleOutlined from "@ant-design/icons/QuestionCircleOutlined";
import SafetyOutlined from "@ant-design/icons/SafetyOutlined";
import SearchOutlined from "@ant-design/icons/SearchOutlined";
import SettingOutlined from "@ant-design/icons/SettingOutlined";
import TeamOutlined from "@ant-design/icons/TeamOutlined";
import TrophyOutlined from "@ant-design/icons/TrophyOutlined";
import UploadOutlined from "@ant-design/icons/UploadOutlined";
import UserAddOutlined from "@ant-design/icons/UserAddOutlined";
import WalletOutlined from "@ant-design/icons/WalletOutlined";
import { Col, Collapse, ConfigProvider, Empty, Flex, Grid, Input, Row, theme, Typography } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUserRoles } from "@/apis/hooks/useUserRoles";
import {
  getHelpGroups,
  getSectionSearchText,
  normalizeText,
  type HelpParagraph,
  type HelpSection,
} from "@/components/help/helpContent";

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

// Mapa de iconos por key
const ICON_MAP: Record<string, React.ReactNode> = {
  TeamOutlined: <TeamOutlined />,
  UserAddOutlined: <UserAddOutlined />,
  LockOutlined: <LockOutlined />,
  DollarOutlined: <DollarOutlined />,
  UploadOutlined: <UploadOutlined />,
  DownloadOutlined: <DownloadOutlined />,
  CalendarOutlined: <CalendarOutlined />,
  WalletOutlined: <WalletOutlined />,
  FundOutlined: <FundOutlined />,
  TrophyOutlined: <TrophyOutlined />,
  PieChartOutlined: <PieChartOutlined />,
  LineChartOutlined: <LineChartOutlined />,
  CalculatorOutlined: <CalculatorOutlined />,
  SettingOutlined: <SettingOutlined />,
  SafetyOutlined: <SafetyOutlined />,
};

// Un hash mal formado (%) no debe romper la página.
const readHash = (): string => {
  const raw = window.location.hash.slice(1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

// replaceState conserva el state del router (key/índice) para no romper su navegación.
const writeHash = (id: string | null) => {
  const { pathname, search } = window.location;
  window.history.replaceState(window.history.state, "", `${pathname}${search}${id ? `#${id}` : ""}`);
};

const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView?.({ block: "start" });
};

function HelpParagraphRenderer({ paragraph }: { paragraph: HelpParagraph }) {
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const screens = useBreakpoint();

  if (paragraph.type === "text") {
    return (
      <Paragraph style={{ marginBottom: token.margin, color: token.colorText, maxWidth: "72ch" }}>
        {paragraph.content as string}
      </Paragraph>
    );
  }

  if (paragraph.type === "list") {
    return (
      <ul
        style={{
          marginBottom: token.margin,
          maxWidth: "72ch",
          paddingLeft: screens.sm ? token.paddingLG : token.padding,
          color: token.colorText,
        }}
      >
        {(paragraph.content as string[]).map((item, idx) => (
          <li key={idx} style={{ marginBottom: token.marginXS }}>
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (paragraph.type === "tip") {
    return (
      <Flex
        data-testid="help-tip"
        gap={token.marginXS}
        align="flex-start"
        style={{
          padding: `${token.paddingSM}px ${token.padding}px`,
          borderRadius: token.borderRadius,
          background: token.colorInfoBg,
          border: `1px solid ${token.colorInfoBorder}`,
          marginBottom: token.margin,
          maxWidth: "72ch",
        }}
      >
        <InfoCircleOutlined
          aria-hidden
          style={{ color: token.colorInfo, marginTop: token.marginXXS + 2, flexShrink: 0 }}
        />
        <div style={{ minWidth: 0, overflowWrap: "break-word" }}>
          <Text strong style={{ color: token.colorText }}>
            {t("help.tipLabel")}{" "}
          </Text>
          <Text style={{ color: token.colorText }}>{paragraph.content as string}</Text>
        </div>
      </Flex>
    );
  }

  return null;
}

function HelpSectionContent({ section }: { section: HelpSection }) {
  return (
    <div>
      {section.content.map((paragraph, idx) => (
        <HelpParagraphRenderer key={idx} paragraph={paragraph} />
      ))}
    </div>
  );
}

export function HelpPage() {
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const { isAdmin } = useUserRoles();

  // El panel de administración solo existe para ADMIN; el resto de roles lo ve en "Roles y permisos".
  const groups = useMemo(
    () =>
      getHelpGroups(t)
        .map((group) => ({ ...group, sections: group.sections.filter((s) => !s.adminOnly || isAdmin) }))
        .filter((group) => group.sections.length > 0),
    [t, isAdmin],
  );
  const allSections = useMemo(() => groups.flatMap((g) => g.sections), [groups]);
  const searchTexts = useMemo(
    () => new Map(allSections.map((s) => [s.id, getSectionSearchText(s)])),
    [allSections],
  );

  // Con hash abre esa sección; sin hash deja abierta la primera para que no sea una pared de filas cerradas.
  const defaultOpen = (): string[] => {
    const hash = readHash();
    if (allSections.some((s) => s.id === hash)) return [hash];
    return allSections[0] ? [allSections[0].id] : [];
  };

  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<string[]>(defaultOpen);

  const normalizedQuery = normalizeText(query.trim());
  const matchesFor = (nq: string) =>
    allSections.filter((s) => !nq || (searchTexts.get(s.id) ?? "").includes(nq)).map((s) => s.id);
  const matchedIds = new Set(matchesFor(normalizedQuery));

  // Al cargar, lleva a la sección del hash; si el hash cambia con la página abierta, también la abre.
  useEffect(() => {
    const hash = readHash();
    if (allSections.some((s) => s.id === hash)) scrollToSection(hash);
    const onHashChange = () => {
      const id = readHash();
      if (!allSections.some((s) => s.id === id)) return;
      setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      scrollToSection(id);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [allSections]);

  const handleSearch = (value: string) => {
    setQuery(value);
    const nq = normalizeText(value.trim());
    setOpenIds(nq ? matchesFor(nq) : defaultOpen());
  };

  const handleGroupChange = (groupIds: string[], keys: string | string[]) => {
    const next = Array.isArray(keys) ? keys : [keys];
    const nextOpen = [...openIds.filter((id) => !groupIds.includes(id)), ...next];
    const added = next.find((id) => !openIds.includes(id));
    setOpenIds(nextOpen);
    if (added) writeHash(added);
    else if (!nextOpen.includes(readHash())) writeHash(null);
  };

  const visibleGroups = groups
    .map((group) => ({ ...group, sections: group.sections.filter((s) => matchedIds.has(s.id)) }))
    .filter((group) => group.sections.length > 0);
  const resultCount = visibleGroups.reduce((sum, g) => sum + g.sections.length, 0);

  const wrapText: React.CSSProperties = { overflowWrap: "break-word", hyphens: "none", minWidth: 0 };

  return (
    <Row justify="center" style={{ paddingTop: 30 }}>
      <Col
        xs={24}
        sm={22}
        md={18}
        lg={14}
        xl={12}
        className="fade-in-up"
        style={{ animationDelay: "0ms", minWidth: 0 }}
      >
        {/* Header */}
        <Flex align="center" gap={12} style={{ marginBottom: token.marginLG }}>
          <div
            data-testid="help-header-icon"
            style={{
              width: 48,
              height: 48,
              flexShrink: 0,
              borderRadius: token.borderRadiusLG,
              background: token.colorFillTertiary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <QuestionCircleOutlined style={{ color: token.colorTextSecondary, fontSize: 24 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <Title level={1} style={{ margin: 0, fontSize: token.fontSizeHeading3, ...wrapText }}>
              {t("help.title")}
            </Title>
            <Text type="secondary" style={wrapText}>
              {t("help.subtitle")}
            </Text>
          </div>
        </Flex>

        {/* Búsqueda */}
        {/* El placeholder por defecto de Ant Design (25% de opacidad) no llega a 4.5:1. */}
        <ConfigProvider theme={{ token: { colorTextPlaceholder: token.colorTextSecondary } }}>
          <Input
            allowClear
            size="large"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            prefix={<SearchOutlined aria-hidden />}
            placeholder={t("help.search.placeholder")}
            aria-label={t("help.search.label")}
            style={{ marginBottom: token.marginXS }}
          />
        </ConfigProvider>
        <div role="status" aria-live="polite" style={{ marginBottom: token.margin, minHeight: token.lineHeight * token.fontSize }}>
          {normalizedQuery && resultCount > 0 && (
            <Text type="secondary">{t("help.search.results", { count: resultCount })}</Text>
          )}
        </div>

        {normalizedQuery && resultCount === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("help.search.empty", { query: query.trim() })}
            style={{ marginBottom: token.marginXL }}
          />
        )}

        {/* Grupos de secciones */}
        {visibleGroups.map((group) => {
          const groupIds = group.sections.map((s) => s.id);
          return (
            <section key={group.key} style={{ marginBottom: token.marginXL }}>
              <Title
                level={2}
                style={{ fontSize: token.fontSizeHeading5, marginTop: 0, marginBottom: token.marginSM, ...wrapText }}
              >
                {group.title}
              </Title>
              <Collapse
                activeKey={openIds.filter((id) => groupIds.includes(id))}
                onChange={(keys) => handleGroupChange(groupIds, keys)}
                expandIconPlacement="end"
                style={{
                  background: token.colorBgContainer,
                  borderRadius: token.borderRadiusLG,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
                items={group.sections.map((section) => ({
                  key: section.id,
                  label: (
                    <Flex id={section.id} align="center" gap={10} style={{ minWidth: 0, scrollMarginTop: 80 }}>
                      <span
                        style={{
                          fontSize: token.fontSizeLG,
                          color: token.colorPrimary,
                          display: "flex",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        {ICON_MAP[section.icon] ?? <QuestionCircleOutlined />}
                      </span>
                      <Text strong style={{ fontSize: token.fontSize, ...wrapText }}>
                        {section.title}
                      </Text>
                    </Flex>
                  ),
                  children: <HelpSectionContent section={section} />,
                }))}
              />
            </section>
          );
        })}
      </Col>
    </Row>
  );
}
