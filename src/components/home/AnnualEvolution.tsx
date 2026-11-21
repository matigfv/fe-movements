import { Card, Empty, Flex, Space, Spin, theme, Typography } from "antd";
import LoadingOutlined from "@ant-design/icons/LoadingOutlined";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type LineLabelProps = { x?: number | string; y?: number | string; index?: number };
import { useBalanceMonthlyEvolution } from "@/apis/hooks/useBalance";
import AnnualEvolutionFilters from "@/components/home/AnnualEvolutionFilters";
import ChartDataTable, { ChartViewToggle } from "@/components/home/ChartDataTable";
import { lastValueIndex } from "@/utils/chartLabels";
import { getChartColors, getChartTheme } from "@/utils/chartTheme";
import { formatAmount } from "@/utils/formatAmount";
import { useLocalStorage } from "@/utils/useLocalStorage";

const SELECTED_CURRENCIES_STORAGE_KEY = "annualEvolution.selectedCurrencies";

type Props = {
  year: number;
};

export default function AnnualEvolution({ year }: Props) {
  const { token } = theme.useToken();
  const colors = getChartColors(token);
  const chartTheme = getChartTheme(token);
  const { t } = useTranslation();
  const [showTable, setShowTable] = useState(false);
  const MONTH_LABELS = t("home.monthsShort", { returnObjects: true }) as string[];
  // Los datos de evolución se obtienen del workspace activo del usuario (DEFAULT_WORKSPACE)
  const { data = [], isFetching } = useBalanceMonthlyEvolution(year);

  const currencies = useMemo(
    () => [...new Set(data.map((d) => d.currencySymbol))],
    [data],
  );

  const [selectedCurrencies, setSelectedCurrencies] = useLocalStorage<string[]>(
    SELECTED_CURRENCIES_STORAGE_KEY,
    [],
  );

  useEffect(() => {
    if (currencies.length === 0) return;
    setSelectedCurrencies((prev) => {
      const stillValid = prev.filter((c) => currencies.includes(c));
      return stillValid.length > 0 ? stillValid : currencies;
    });
  }, [currencies, setSelectedCurrencies]);

  const chartData = useMemo(() => {
    const byMonth = data.reduce(
      (acc, item) => {
        const label = MONTH_LABELS[item.month - 1];
        if (!acc[label]) acc[label] = { month: label };
        acc[label][`${item.currencySymbol}_spent`] = item.spent;
        acc[label][`${item.currencySymbol}_savings`] = item.savings;
        return acc;
      },
      {} as Record<string, Record<string, unknown>>,
    );
    // Garantizar los 12 meses en el frontend como fallback defensivo
    return MONTH_LABELS.map((label) => byMonth[label] ?? { month: label });
  }, [data, MONTH_LABELS]);

  // One entry per plotted line, shared by the chart, its end labels and the table twin.
  const series = currencies
    .filter((currency) => selectedCurrencies.includes(currency))
    .flatMap((currency) => [
      {
        key: `${currency}_spent`,
        currency,
        name: t("home.annualEvolutionExpenseLegend", { currency }),
        color: colors[currencies.indexOf(currency) % colors.length],
        dashed: false,
      },
      {
        key: `${currency}_savings`,
        currency,
        name: t("home.annualEvolutionSavingsLegend", { currency }),
        color: colors[currencies.indexOf(currency) % colors.length],
        dashed: true,
      },
    ]);
  const ariaLabel = t("home.annualEvolutionAria", {
    title: t("home.annualEvolutionTitle"),
    year,
  });

  return (
    <Card
      title={t("home.annualEvolutionTitle")}
      // Currencies are picked inside the card, so only the period is shown here.
      extra={
        <Space size="small" wrap>
          {data.length > 0 && !isFetching && (
            <ChartViewToggle
              showingTable={showTable}
              onToggle={() => setShowTable((v) => !v)}
            />
          )}
          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            {year}
          </Typography.Text>
        </Space>
      }
      className="fade-in-up"
      style={{
        borderRadius: token.borderRadiusLG,
        borderColor: token.colorBorder,
        animationDelay: "420ms",
      }}
    >
      {isFetching ? (
        <Flex justify="center" style={{ padding: 40 }}>
          <Spin indicator={<LoadingOutlined spin />} size="large" />
        </Flex>
      ) : data.length === 0 ? (
        <Flex justify="center" style={{ padding: 40 }}>
          <Empty description={t("home.annualEvolutionEmpty")} />
        </Flex>
      ) : (
        <>
          <AnnualEvolutionFilters
            currencies={currencies}
            selected={selectedCurrencies}
            onChange={setSelectedCurrencies}
          />
          {showTable ? (
          <ChartDataTable
            label={ariaLabel}
            rowKey="month"
            rows={chartData.map((row) => ({
              month: String(row.month),
              ...Object.fromEntries(
                series.map((line) => {
                  const value = row[line.key];
                  return [
                    line.key,
                    typeof value === "number"
                      ? formatAmount(value, line.currency)
                      : "—",
                  ];
                }),
              ),
            }))}
            columns={[
              { title: t("home.tableMonth"), dataIndex: "month" },
              ...series.map((line) => ({
                title: line.name,
                dataIndex: line.key,
                align: "right" as const,
              })),
            ]}
          />
          ) : (
          <div role="img" aria-label={ariaLabel}>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 96, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartTheme.grid}
              />
              <XAxis dataKey="month" tick={chartTheme.tick} stroke={chartTheme.grid} />
              <YAxis tick={chartTheme.tick} stroke={chartTheme.grid} width={70} />
              <Tooltip
                {...chartTheme.tooltip}
                formatter={(val, _name, item) =>
                  formatAmount(
                    Number(val ?? 0),
                    String(item.dataKey).split("_")[0],
                    20,
                  )
                }
              />
              <Legend formatter={chartTheme.legendFormatter} />
              {series.map((line) => {
                const lastIdx = lastValueIndex(chartData, line.key);
                return (
                  <Line
                    key={line.key}
                    type="monotone"
                    dataKey={line.key}
                    name={line.name}
                    stroke={line.color}
                    strokeWidth={2}
                    strokeDasharray={line.dashed ? "5 5" : undefined}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                    label={({ x, y, index }: LineLabelProps) =>
                      index === lastIdx ? (
                        <text
                          x={Number(x) + 8}
                          y={y}
                          dominantBaseline="central"
                          style={{ fontSize: 12, fill: line.color, fontFamily: "inherit" }}
                        >
                          {line.name}
                        </text>
                      ) : (
                        <g />
                      )
                    }
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
          </div>
          )}
        </>
      )}
    </Card>
  );
}
