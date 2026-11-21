import ArrowDownOutlined from "@ant-design/icons/ArrowDownOutlined";
import ArrowUpOutlined from "@ant-design/icons/ArrowUpOutlined";
import TagOutlined from "@ant-design/icons/TagOutlined";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  Col,
  Flex,
  Row,
  Skeleton,
  Statistic,
  Tag,
  Tabs,
  theme,
  Typography,
} from "antd";
import { useUserDefault } from "@/apis/hooks/useSettings";
import { useWorkspaceSummary } from "@/apis/hooks/useWorkspaceSummary";
import type { WorkspaceSummaryPerCurrency } from "@/models/WorkspaceSummary";
import BudgetAlert from "@/components/home/BudgetAlert";
import { formatAmount } from "@/utils/formatAmount";

dayjs.locale("es");

const { Text, Title } = Typography;

// ── DeltaBadge ────────────────────────────────────────────────────────────────

interface DeltaBadgeProps {
  /** Real change vs the previous month: positive when the amount went up. */
  delta: number;
  /** Whether an increase is good news (income, net) or bad news (expenses). */
  upIsGood: boolean;
  currency: string;
}

function DeltaBadge({ delta, upIsGood, currency }: DeltaBadgeProps) {
  const { token } = theme.useToken();
  const { t } = useTranslation();

  if (delta === 0) {
    return (
      <Text type="secondary" style={{ fontSize: 13 }}>
        {t("home.monthlySummary.deltaSame")}
      </Text>
    );
  }

  const isUp = delta > 0;
  // Arrow follows the real direction; color (and the words) carry good/bad.
  const color = isUp === upIsGood ? token.colorSuccess : token.colorError;
  const Icon = isUp ? ArrowUpOutlined : ArrowDownOutlined;
  const amount = formatAmount(Math.abs(delta), currency);

  return (
    <Flex align="center" gap={4}>
      <Icon style={{ color, fontSize: 12 }} />
      <Text style={{ color, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
        {t(
          isUp
            ? "home.monthlySummary.deltaMore"
            : "home.monthlySummary.deltaLess",
          { amount },
        )}
      </Text>
    </Flex>
  );
}

// ── KpiCard ───────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  amount: number;
  delta: number;
  upIsGood: boolean;
  currency: string;
  icon: React.ReactNode;
  iconBg: string;
  loading: boolean;
  animationDelay: string;
  hero?: boolean;
}

function KpiCard({
  title,
  amount,
  delta,
  upIsGood,
  currency,
  icon,
  iconBg,
  loading,
  animationDelay,
  hero = false,
}: KpiCardProps) {
  const { token } = theme.useToken();
  const isNegative = amount < 0;
  const valueColor = isNegative ? token.colorError : token.colorSuccess;

  return (
    <Col xs={24} sm={hero ? 24 : 12} lg={hero ? 12 : 6}>
      <Card
        data-testid={hero ? "kpi-hero" : undefined}
        loading={loading}
        className="fade-in-up"
        style={{
          borderRadius: token.borderRadiusLG,
          borderColor: token.colorBorder,
          height: "100%",
          animationDelay,
        }}
        styles={{ body: { padding: hero ? "22px 24px" : "18px 20px" } }}
      >
        <Flex align="flex-start" gap={14}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: token.borderRadius,
              background: iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 18,
              marginTop: 2,
            }}
          >
            {icon}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text
              type="secondary"
              style={{ fontSize: 12, display: "block", marginBottom: 2 }}
            >
              {title}
            </Text>
            <Statistic
              value={Math.abs(amount)}
              prefix={`${isNegative ? "-" : ""}${currency} `}
              formatter={(value) => formatAmount(Number(value), null, 2, 2)}
              styles={{
                content: {
                  fontSize: hero ? 34 : 18,
                  fontWeight: hero ? 700 : 600,
                  color: valueColor,
                  lineHeight: 1.2,
                  fontVariantNumeric: "tabular-nums",
                },
              }}
              style={{ marginBottom: 4 }}
            />
            <DeltaBadge delta={delta} upIsGood={upIsGood} currency={currency} />
          </div>
        </Flex>
      </Card>
    </Col>
  );
}

// ── CurrencyPanel ─────────────────────────────────────────────────────────────

interface CurrencyPanelProps {
  data: WorkspaceSummaryPerCurrency;
  loading: boolean;
}

function CurrencyPanel({ data, loading }: CurrencyPanelProps) {
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const { totalIncome, totalSpent, net, topSpendingCategory, vsPreviousMonth } = data;

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <KpiCard
          title={t("home.monthlySummary.differenceTitle")}
          amount={net}
          delta={vsPreviousMonth.incomeDelta - vsPreviousMonth.spentDelta}
          upIsGood
          currency={data.currency}
          icon={
            net >= 0 ? (
              <ArrowUpOutlined style={{ color: token.colorSuccess }} />
            ) : (
              <ArrowDownOutlined style={{ color: token.colorError }} />
            )
          }
          iconBg={net >= 0 ? token.colorSuccessBg : token.colorErrorBg}
          loading={loading}
          animationDelay="60ms"
          hero
        />
        <KpiCard
          title={t("home.monthlySummary.incomeTitle")}
          amount={totalIncome}
          delta={vsPreviousMonth.incomeDelta}
          upIsGood
          currency={data.currency}
          icon={<ArrowUpOutlined style={{ color: token.colorSuccess }} />}
          iconBg={token.colorSuccessBg}
          loading={loading}
          animationDelay="120ms"
        />
        <KpiCard
          title={t("home.monthlySummary.expenseTitle")}
          amount={-totalSpent}
          delta={vsPreviousMonth.spentDelta}
          upIsGood={false}
          currency={data.currency}
          icon={<ArrowDownOutlined style={{ color: token.colorError }} />}
          iconBg={token.colorErrorBg}
          loading={loading}
          animationDelay="180ms"
        />
      </Row>

      {loading ? (
        <Skeleton.Input active style={{ width: 200, height: 22 }} />
      ) : topSpendingCategory ? (
        <Flex
          align="center"
          gap={8}
          className="fade-in-up"
          style={{ animationDelay: "240ms" }}
        >
          <TagOutlined
            style={{ color: token.colorTextSecondary, fontSize: 13 }}
          />
          <Text type="secondary" style={{ fontSize: 13 }}>
            {t("home.monthlySummary.topCategoryLabel")}
          </Text>
          <Tag
            color="default"
            style={{ margin: 0, fontWeight: 600, letterSpacing: "0.02em" }}
          >
            {topSpendingCategory}
          </Tag>
        </Flex>
      ) : null}
    </>
  );
}

// ── MonthlySummary ────────────────────────────────────────────────────────────

export default function MonthlySummary() {
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const now = dayjs();
  const year = now.year();
  const month = now.month() + 1;
  const monthLabel = now.format("MMMM YYYY");

  const { data: defaultWorkspace } = useUserDefault("DEFAULT_WORKSPACE");
  const workspaceId = defaultWorkspace?.value ?? null;

  const { data, isFetching, isError, refetch } = useWorkspaceSummary(
    workspaceId,
    year,
    month,
  );

  if (isError) {
    return (
      <Flex align="center" gap={8} wrap="wrap" style={{ paddingTop: 16 }}>
        <Text type="secondary">{t("home.monthlySummary.errorMessage")}</Text>
        <Button
          type="link"
          size="small"
          loading={isFetching}
          onClick={() => void refetch()}
        >
          {t("home.monthlySummary.retry")}
        </Button>
      </Flex>
    );
  }

  const loading = isFetching && !data;
  const perCurrency = data?.perCurrency ?? [];
  const totalUSD = data?.totalUsd;

  // Sin ingresos ni gastos este mes — no tiene sentido mostrar el resumen
  if (!loading && perCurrency.length === 0) {
    return null;
  }

  // ── Tabs items ──────────────────────────────────────────────────────────────
  const tabItems = perCurrency.map((moneda) => ({
    key: moneda.currency,
    label: moneda.currency,
    children: <CurrencyPanel data={moneda} loading={loading} />,
  }));

  return (
    <div style={{ width: "100%" }}>
      {/* Section header */}
      <Flex
        align="baseline"
        gap={12}
        style={{ marginBottom: 16 }}
        className="fade-in-up"
      >
        <Title
          level={4}
          style={{ margin: 0, fontWeight: 600, animationDelay: "0ms" }}
        >
          {t("home.monthlySummary.titlePrefix")}{" "}
          <span
            style={{ color: token.colorPrimary, textTransform: "capitalize" }}
          >
            {monthLabel}
          </span>
        </Title>
        {isFetching && (
          <Skeleton.Input active size="small" style={{ width: 80 }} />
        )}
      </Flex>

      {/* Loading skeleton cuando no hay datos todavía */}
      {loading ? (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {[60, 120, 180].map((delay) => (
            <Col
              key={delay}
              xs={24}
              sm={delay === 60 ? 24 : 12}
              lg={delay === 60 ? 12 : 6}
            >
              <Card
                loading
                className="fade-in-up"
                style={{
                  borderRadius: token.borderRadiusLG,
                  borderColor: token.colorBorder,
                  height: "100%",
                  animationDelay: `${delay}ms`,
                }}
                styles={{ body: { padding: "18px 20px" } }}
              />
            </Col>
          ))}
        </Row>
      ) : perCurrency.length === 1 ? (
        /* Una sola moneda — sin tabs */
        <CurrencyPanel data={perCurrency[0]} loading={false} />
      ) : (
        /* Múltiples monedas — tabs */
        <Tabs
          defaultActiveKey={perCurrency[0].currency}
          items={tabItems}
          style={{ marginBottom: 8 }}
        />
      )}

      {/* Total unificado en USD — quiet subline, the KPIs above are the protagonists */}
      {totalUSD && !loading && (
        <Flex
          align="center"
          gap="4px 20px"
          wrap="wrap"
          className="fade-in-up"
          style={{ marginTop: 4, animationDelay: "60ms" }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("home.monthlySummary.totalUsdLabel")}
          </Text>
          <Flex align="center" gap={6}>
            <ArrowUpOutlined style={{ color: token.colorSuccess, fontSize: 12 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>{t("home.monthlySummary.incomeLabel")}</Text>
            <Text style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
              {formatAmount(totalUSD.totalIncome, "USD", 2)}
            </Text>
          </Flex>
          <Flex align="center" gap={6}>
            <ArrowDownOutlined style={{ color: token.colorError, fontSize: 12 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>{t("home.monthlySummary.expenseLabel")}</Text>
            <Text style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
              {formatAmount(totalUSD.totalSpent, "USD", 2)}
            </Text>
          </Flex>
          <Flex align="center" gap={6}>
            {totalUSD.net >= 0 ? (
              <ArrowUpOutlined style={{ color: token.colorSuccess, fontSize: 12 }} />
            ) : (
              <ArrowDownOutlined style={{ color: token.colorError, fontSize: 12 }} />
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>{t("home.monthlySummary.netDifferenceLabel")}</Text>
            <Text
              style={{
                fontSize: 12,
                fontVariantNumeric: "tabular-nums",
                color: totalUSD.net >= 0 ? token.colorSuccess : token.colorError,
              }}
            >
              {formatAmount(totalUSD.net, "USD", 2)}
            </Text>
          </Flex>
        </Flex>
      )}

      <BudgetAlert />
    </div>
  );
}
