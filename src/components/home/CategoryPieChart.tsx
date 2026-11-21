import { Card, Empty, Flex, Space, Spin, theme, Typography } from "antd";
import LoadingOutlined from "@ant-design/icons/LoadingOutlined";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getChartColors, getChartTheme } from "@/utils/chartTheme";
import ChartDataTable, { ChartViewToggle } from "@/components/home/ChartDataTable";
import { sliceLabel } from "@/utils/chartLabels";
import { formatAmount } from "@/utils/formatAmount";
import type { BalanceFilters } from "@/models/BalanceFilters";

type CategoryChartItem = {
  name: string;
  value: number;
};

type CategoryPieChartProps = {
  data: CategoryChartItem[];
  isFetching: boolean;
  filters: BalanceFilters;
};

export default function CategoryPieChart({
  data,
  isFetching,
  filters,
}: CategoryPieChartProps) {
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const [showTable, setShowTable] = useState(false);

  const colors = getChartColors(token);
  const chartTheme = getChartTheme(token);

  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data],
  );

  // Currency and period live in a collapsed filter panel: surface them here.
  const [from, to] = filters.dates.map((d) => dayjs(d).locale("es"));
  const period = from.isSame(to, "month")
    ? from.format("MMMM YYYY")
    : `${from.format("DD/MM/YYYY")} – ${to.format("DD/MM/YYYY")}`;
  const ariaLabel = t("home.categoryPieAria", {
    title: t("home.categoryPieTitle"),
    currency: filters.currency,
    period,
  });
  const contextLabel = (
    <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400, textTransform: "capitalize" }}>
      {`${filters.currency} · ${period}`}
    </Typography.Text>
  );

  if (isFetching) {
    return (
      <Card
        title={t("home.categoryPieTitle")}
        extra={contextLabel}
        className="fade-in-up"
        style={{
          borderRadius: token.borderRadiusLG,
          borderColor: token.colorBorder,
          height: "100%",
          animationDelay: "300ms",
        }}
      >
        <Flex justify="center" style={{ padding: 40 }}>
          <Spin indicator={<LoadingOutlined spin />} size="large" />
        </Flex>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card
        title={t("home.categoryPieTitle")}
        extra={contextLabel}
        className="fade-in-up"
        style={{
          borderRadius: token.borderRadiusLG,
          borderColor: token.colorBorder,
          height: "100%",
          animationDelay: "300ms",
        }}
      >
        <Flex justify="center" style={{ padding: 40 }}>
          <Empty description={t("home.categoryPieEmpty")} />
        </Flex>
      </Card>
    );
  }

  return (
    <Card
      title={t("home.categoryPieTitle")}
      extra={
        <Space size="small">
          <ChartViewToggle
            showingTable={showTable}
            onToggle={() => setShowTable((v) => !v)}
          />
          {contextLabel}
        </Space>
      }
      className="fade-in-up"
      style={{
        borderRadius: token.borderRadiusLG,
        borderColor: token.colorBorder,
        height: "100%",
        animationDelay: "300ms",
      }}
    >
      {showTable ? (
        <ChartDataTable
          label={ariaLabel}
          rowKey="name"
          rows={data.map((item) => ({
            name: item.name,
            amount: formatAmount(item.value, filters.currency, 2),
            percent: `${total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0"}%`,
          }))}
          columns={[
            { title: t("home.tableCategory"), dataIndex: "name" },
            { title: t("home.tableAmount"), dataIndex: "amount", align: "right" },
            { title: t("home.tablePercent"), dataIndex: "percent", align: "right" },
          ]}
        />
      ) : (
      <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={3}
            label={({ x, y, textAnchor, name, percent }: PieLabelRenderProps) => {
              const text = sliceLabel(String(name), Number(percent));
              return text ? (
                <text
                  x={x}
                  y={y}
                  textAnchor={textAnchor}
                  dominantBaseline="central"
                  style={{ fontSize: 12, fill: token.colorText, fontFamily: "inherit" }}
                >
                  {text}
                </text>
              ) : (
                <g />
              );
            }}
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={colors[idx % colors.length]} />
            ))}
          </Pie>
          {/* Total central */}
          <text
            x="50%"
            y="46%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: 13,
              fill: token.colorTextSecondary,
              fontFamily: "inherit",
            }}
          >
            {t("home.categoryPieTotal")}
          </text>
          <text
            x="50%"
            y="56%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: 16,
              fontWeight: 700,
              fill: token.colorText,
              fontFamily: "inherit",
            }}
          >
            {formatAmount(total, filters.currency)}
          </text>
          <Tooltip
            {...chartTheme.tooltip}
            formatter={(val, name) => {
              const pct =
                total > 0 ? ((Number(val) / total) * 100).toFixed(1) : "0.0";
              return [
                `${formatAmount(Number(val), filters.currency, 20)} (${pct}%)`,
                name,
              ];
            }}
          />
          <Legend formatter={chartTheme.legendFormatter} />
        </PieChart>
      </ResponsiveContainer>
      </div>
      )}
    </Card>
  );
}
