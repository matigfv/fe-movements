import { Popover, Spin, Typography } from "antd";
import LineChartOutlined from "@ant-design/icons/LineChartOutlined";
import { useTranslation } from "react-i18next";
import { useItemPriceHistory } from "@/apis/hooks/useMovementItems";
import {
  MovementItemUnitEnum,
  getMovementItemUnitLabel,
} from "@/enums/MovementItemUnitEnum";

const { Text } = Typography;

const MAX_POINTS_SHOWN = 5;

function PriceHistoryContent({ description }: { description: string }) {
  const { t } = useTranslation();
  const unitLabel = getMovementItemUnitLabel(t);
  const { data: series = [], isLoading } = useItemPriceHistory(description);

  if (isLoading) return <Spin size="small" />;
  if (series.length === 0) return <Text type="secondary">{t("movements.items.priceHistory.empty")}</Text>;

  return (
    <div style={{ minWidth: 200 }}>
      {series.map((s) => {
        const variation = s.variationPercent;
        return (
          <div key={`${s.unit}-${s.currency}`} style={{ marginBottom: 8 }}>
            <Text strong>
              {t("movements.items.priceHistory.perUnit", {
                unit: unitLabel[s.unit as MovementItemUnitEnum] ?? s.unit,
                currency: s.currency,
              })}
            </Text>
            {variation != null && (
              <Text type={variation > 0 ? "danger" : "success"} style={{ marginLeft: 8 }}>
                {`${variation > 0 ? "+" : ""}${variation}%`}
              </Text>
            )}
            {s.points.slice(-MAX_POINTS_SHOWN).map((p) => (
              <div key={`${p.date}-${p.unitPrice}`}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {p.date}
                </Text>
                <Text style={{ float: "right", fontSize: 12 }}>${p.unitPrice.toFixed(2)}</Text>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function ItemPriceHistoryPopover({ description }: { description: string }) {
  const { t } = useTranslation();
  return (
    <Popover
      trigger="click"
      title={t("movements.items.priceHistory.title", { description })}
      content={<PriceHistoryContent description={description} />}
    >
      <LineChartOutlined
        aria-label={t("movements.items.priceHistory.tooltip")}
        style={{ marginLeft: 8, fontSize: 12, color: "gray", cursor: "pointer" }}
      />
    </Popover>
  );
}
