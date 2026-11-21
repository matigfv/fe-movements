import { Progress, Skeleton, Typography, theme } from "antd";
import CheckCircleFilled from "@ant-design/icons/CheckCircleFilled";
import { useTranslation } from "react-i18next";
import type { Service } from "@/models/Service";
import { useCurrentUser } from "@/apis/hooks/useCurrentUser";
import { formatAmount } from "@/utils/formatAmount";
import { getServiceLabels } from "@/utils/serviceLabels";
import { groupServiceTotals } from "@/utils/serviceTotals";

const { Title, Text } = Typography;

interface ServiceSummaryProps {
  services: Service[];
  isFetching: boolean;
}

export function ServiceSummary({ services, isFetching }: ServiceSummaryProps) {
  const { token } = theme.useToken();
  const { data: currentUser } = useCurrentUser();
  const { t } = useTranslation();
  const labels = getServiceLabels(currentUser?.userType ?? null, t);

  const unpaidServices = services.filter((s) => !s.isPaid);
  const paidServices = services.filter((s) => s.isPaid);
  const groups = groupServiceTotals(services);
  const isMultiCurrency = groups.length > 1;
  // Amounts of different currencies are never summed, so progress falls back to counts.
  const paidPercent = isMultiCurrency
    ? Math.round((paidServices.length / services.length) * 100)
    : groups[0] && groups[0].total > 0
      ? Math.round(((groups[0].total - groups[0].pending) / groups[0].total) * 100)
      : 100;
  const allPaid = services.length > 0 && unpaidServices.length === 0;

  const accent = allPaid ? token.colorSuccess : token.colorWarning;
  const accentBg = allPaid ? token.colorSuccessBg : token.colorWarningBg;
  const accentBorder = allPaid ? token.colorSuccessBorder : token.colorWarningBorder;

  return (
    <div
      className="fade-in-up"
      style={{
        borderRadius: token.borderRadiusLG,
        padding: "22px 28px",
        marginBottom: 24,
        background: accentBg,
        border: `1px solid ${accentBorder}`,
      }}
    >
      {isFetching ? (
        <Skeleton active title={{ width: 220 }} paragraph={{ rows: 1, width: "60%" }} />
      ) : allPaid ? (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <CheckCircleFilled style={{ fontSize: 30, color: accent, flexShrink: 0 }} />
          <div>
            <Title level={4} style={{ margin: 0, color: token.colorTextHeading }}>
              {t("services.summary.allPaidTitle")}
            </Title>
            <Text type="secondary">
              {t("services.summary.allPaidDescription", {
                count: services.length,
                plural: labels.pluralLower,
              })}
            </Text>
          </div>
        </div>
      ) : (
        <>
          <Text
            type="secondary"
            style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}
          >
            {t("services.summary.periodLabel")}
          </Text>
          <div style={{ margin: "2px 0 14px" }}>
            {groups.map((g) => (
              <Title
                key={g.currency ?? "none"}
                level={isMultiCurrency ? 4 : 2}
                data-testid="currency-line"
                style={{ margin: 0, color: token.colorTextHeading }}
              >
                <span style={{ color: accent }}>
                  {/* Only the amount stays together; the suffix may wrap so it never overflows on phones. */}
                  <span style={{ whiteSpace: "nowrap" }}>{formatAmount(g.pending, g.currency, 2)}</span>{" "}
                  {t("services.summary.pendingSuffix")}
                </span>{" "}
                <Text type="secondary" style={{ fontSize: 16, fontWeight: 400, whiteSpace: "nowrap" }}>
                  {t("services.summary.ofTotal", { total: formatAmount(g.total, g.currency, 2) })}
                </Text>
              </Title>
            ))}
          </div>
          <Progress
            percent={paidPercent}
            showInfo={false}
            strokeColor={token.colorSuccess}
            railColor={token.colorWarningBorder}
            strokeLinecap="round"
            size={["100%", 10]}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ fontSize: 12, color: token.colorSuccess, fontWeight: 600 }}>
              {paidServices.length} {labels.alDia}
            </Text>
            <Text style={{ fontSize: 12, color: accent, fontWeight: 600 }}>
              {unpaidServices.length} {labels.pendientes}
            </Text>
          </div>
        </>
      )}
    </div>
  );
}
