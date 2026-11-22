import { Card, Flex, theme, Typography } from "antd";
import type { CSSProperties, ReactNode } from "react";

const { Title, Text } = Typography;

interface SettingSectionProps {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned action area of the header (e.g. an "Agregar" button). */
  extra?: ReactNode;
  loading?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Shared header + body for every card of the settings screen, so they all look alike. */
export function SettingSection({
  icon,
  title,
  subtitle,
  extra,
  loading,
  style,
  children,
}: SettingSectionProps) {
  const { token } = theme.useToken();

  return (
    <Card
      loading={loading}
      style={{ borderRadius: token.borderRadiusLG, ...style }}
    >
      <Flex
        align="center"
        justify="space-between"
        gap={token.marginSM}
        wrap
        style={{ marginBottom: token.marginMD }}
      >
        <Flex align="center" gap={12} style={{ minWidth: 0, flex: 1 }}>
          <div
            data-testid="setting-section-icon"
            style={{
              width: 40,
              height: 40,
              borderRadius: token.borderRadius,
              background: token.colorFillTertiary,
              color: token.colorTextSecondary,
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <Flex vertical style={{ minWidth: 0 }}>
            <Title level={5} style={{ margin: 0 }}>
              {title}
            </Title>
            {subtitle && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                {subtitle}
              </Text>
            )}
          </Flex>
        </Flex>
        {extra}
      </Flex>
      {children}
    </Card>
  );
}

/** Tinted "default" pill shared by the bank and currency rows. */
export function DefaultPill({ children }: { children: ReactNode }) {
  const { token } = theme.useToken();
  return (
    <span
      style={{
        background: token.colorPrimaryBg,
        borderRadius: token.borderRadiusSM,
        color: token.colorText,
        fontSize: 12,
        padding: "0 8px",
        lineHeight: "20px",
      }}
    >
      {children}
    </span>
  );
}
