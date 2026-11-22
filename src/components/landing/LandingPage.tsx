import { useEffect } from "react";
import { Button, ConfigProvider, Grid, Typography, theme } from "antd";
import esES from "antd/locale/es_ES";
import enUS from "antd/locale/en_US";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LandingVideo from "@/components/landing/LandingVideo";
import { ThemeProvider } from "@/apis/theme/ThemeProvider";
import { useTheme } from "@/apis/theme/ThemeContext";

const { Title, Paragraph, Text } = Typography;
const { useBreakpoint } = Grid;

const FEATURE_KEYS = ["import", "shared", "insights", "currency"] as const;

// From the app logo: the green of the wallet and the navy of its tile.
const BRAND_GREEN = "#237804";
const BRAND_NAVY = "#0f2a5c";

interface LandingContentProps {
  onLogin: () => void;
}

function LandingContent({ onLogin }: LandingContentProps) {
  const { t, i18n } = useTranslation();
  const { token } = theme.useToken();
  const { isDark } = useTheme();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isWide = !!screens.lg;
  const gutter = isMobile ? 20 : 48;
  // colorTextSecondary on pure black is 4.4:1; these clear 4.5:1 on both themes.
  const muted = isDark ? "rgba(255, 255, 255, 0.75)" : "rgba(0, 0, 0, 0.68)";

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage === "en" ? "en" : "es";
  }, [i18n.resolvedLanguage]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: token.colorBgLayout,
        color: token.colorText,
      }}
    >
      <header
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: `16px ${gutter}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/favicon.png" alt="" width={36} height={36} />
          <Text strong style={{ fontSize: 18, whiteSpace: "nowrap" }}>
            Movements
          </Text>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LanguageSwitcher />
          {!isMobile && (
            <Button type="primary" onClick={onLogin}>
              {t("landing.login")}
            </Button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: `0 ${gutter}px` }}>
        <section
          className="fade-in-up"
          style={{
            display: "grid",
            gridTemplateColumns: isWide ? "minmax(0, 5fr) minmax(0, 7fr)" : "minmax(0, 1fr)",
            gap: isWide ? 56 : 32,
            alignItems: "center",
            paddingTop: isMobile ? 24 : 56,
            paddingBottom: isMobile ? 48 : 72,
          }}
        >
          <div>
            <Title
              level={1}
              style={{
                margin: 0,
                fontSize: isMobile ? 38 : isWide ? 56 : 60,
                lineHeight: 1.06,
                letterSpacing: "-0.03em",
                fontWeight: 700,
                textWrap: "balance",
              }}
            >
              {t("landing.title")}
            </Title>
            <Paragraph
              style={{
                maxWidth: "46ch",
                margin: `${isMobile ? 16 : 24}px 0 ${isMobile ? 24 : 28}px`,
                fontSize: isMobile ? 16 : 19,
                color: muted,
              }}
            >
              {t("landing.subtitle")}
            </Paragraph>
            <Button type="primary" size="large" onClick={onLogin}>
              {t("landing.login")}
            </Button>
            <Paragraph style={{ maxWidth: "46ch", margin: "16px 0 0", color: muted }}>
              {t("landing.trust")}
            </Paragraph>
          </div>

          <div
            style={{
              padding: isMobile ? 8 : 14,
              borderRadius: 18,
              background: BRAND_NAVY,
              boxShadow: "0 24px 48px -24px rgba(0, 0, 0, 0.5)",
            }}
          >
            <LandingVideo mutedColor="rgba(255, 255, 255, 0.78)" />
          </div>
        </section>

        <section
          aria-label={t("landing.featuresLabel")}
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            columnGap: 64,
            paddingBottom: isMobile ? 32 : 56,
          }}
        >
          {FEATURE_KEYS.map((key, index) => (
            <div
              key={key}
              style={{
                borderTop: `${index === 0 ? 2 : 1}px solid ${
                  index === 0 ? BRAND_GREEN : token.colorBorderSecondary
                }`,
                padding: "24px 0 32px",
              }}
            >
              <Title level={2} style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
                {t(`landing.features.${key}.title`)}
              </Title>
              <Paragraph style={{ margin: "8px 0 0", maxWidth: "52ch", color: muted }}>
                {t(`landing.features.${key}.text`)}
              </Paragraph>
            </div>
          ))}
        </section>

        <section
          style={{
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            padding: `${isMobile ? 40 : 56}px 0`,
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <Title level={2} style={{ margin: 0, fontWeight: 700, letterSpacing: "-0.02em" }}>
            {t("landing.closing")}
          </Title>
          <Button type="primary" size="large" onClick={onLogin}>
            {t("landing.loginClosing")}
          </Button>
        </section>
      </main>

      <footer
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: `0 ${gutter}px 32px`,
          color: muted,
        }}
      >
        Movements © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function ThemedLanding(props: LandingContentProps) {
  const { isDark } = useTheme();
  const { i18n } = useTranslation();

  return (
    <ConfigProvider
      locale={i18n.resolvedLanguage === "en" ? enUS : esES}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { fontFamily: "Inter", borderRadius: 10, colorPrimary: BRAND_GREEN },
      }}
    >
      <LandingContent {...props} />
    </ConfigProvider>
  );
}

/** Public page shown at "/" to visitors without a session. Its only action is logging in. */
export default function LandingPage(props: LandingContentProps) {
  return (
    <ThemeProvider>
      <ThemedLanding {...props} />
    </ThemeProvider>
  );
}
