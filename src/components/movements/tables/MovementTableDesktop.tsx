import { Card, Checkbox, Col, Collapse, Empty, Flex, Row, Tag, Typography, theme } from "antd";
import DownOutlined from "@ant-design/icons/DownOutlined";
import { useTranslation } from "react-i18next";
import type { MovementTableViewProps } from "@/components/movements/tables/types";
import { TypeEnum, getTypeEnumLabel } from "@/enums/TypeEnum";
import CategoryCircleTable from "@/components/movements/tables/CategoryCircleTable";
import { capitalizeFirst } from "@/utils/stringFunctions";
import { movementRowClassName } from "@/utils/movementRowClassName";
import MovementActionButtons from "@/components/movements/tables/MovementActionButtons";
import MovementItemsBreakdown from "@/components/movements/tables/MovementItemsBreakdown";
import PendingDeleteIndicator from "@/components/PendingDeleteIndicator";

const { Text } = Typography;

const COL_PADDING = "8px 16px";

export default function MovementTableDesktop({
  movements,
  onDelete,
  getCardStyle,
  selectedIds,
  onToggleSelect,
  allSelected,
  someSelected,
  onToggleSelectAll,
  expandedIds,
  onToggleExpand,
  animateEntrance,
  emptyAction,
}: MovementTableViewProps) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const typeEnumLabel = getTypeEnumLabel(t);

  return (
    <div role="table" aria-label={t("nav.movements")}>
      <div role="rowgroup">
        <Card
          style={{ marginBottom: 8, borderRadius: 6 }}
          styles={{ body: { padding: COL_PADDING } }}
        >
          <Row justify="center" align="middle" role="row">
          <Col span={1} role="columnheader">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected && !allSelected}
              onChange={onToggleSelectAll}
              aria-label={t("movements.bulk.selectAllAriaLabel")}
            />
          </Col>
            <Col span={2} role="columnheader">{t("movements.columnDate")}</Col>
            <Col span={2} role="columnheader">{t("movements.columnCategory")}</Col>
            <Col span={2} role="columnheader">{t("movements.columnBank")}</Col>
            <Col span={2} role="columnheader">{t("movements.columnType")}</Col>
            <Col span={6} role="columnheader">{t("movements.columnDescription")}</Col>
            <Col span={2} role="columnheader" style={{ textAlign: "center" }}>
              {t("movements.columnInstallments")}
            </Col>
            <Col span={4} role="columnheader" style={{ textAlign: "right" }}>
              {t("movements.columnAmount")}
            </Col>
            <Col span={3} role="columnheader" style={{ textAlign: "right" }}>
              {t("movements.columnActions")}
            </Col>
          </Row>
        </Card>
      </div>

      <div role="rowgroup" style={{ maxHeight: "75vh", overflowY: "auto" }}>
        {movements.length === 0 ? (
          <Empty description={t("movements.noMovements")} style={{ padding: "40px 0" }}>
            {emptyAction}
          </Empty>
        ) : (
          movements.map((record) => {
            const hasItems = record.items.length > 0;
            const isExpanded = hasItems && expandedIds.has(record.id);
            return (
              <Card
                key={record.id}
                hoverable
                className={movementRowClassName(record, animateEntrance)}
                onClick={() => hasItems && onToggleExpand(record.id)}
                style={{
                  position: "relative",
                  cursor: hasItems ? "pointer" : "default",
                  ...getCardStyle(record),
                }}
                styles={{ body: { padding: COL_PADDING } }}
              >
                {record.isPendingRemoval && <PendingDeleteIndicator />}
                <Row justify="center" align="middle" role="row">
                  <Col span={1} role="cell" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(record.id)}
                      onChange={() => onToggleSelect(record.id)}
                      aria-label={t("movements.bulk.selectRowAriaLabel")}
                    />
                  </Col>
                  <Col span={2} role="cell">{record.formattedDate}</Col>
                  <Col span={2} role="cell">
                    <CategoryCircleTable categories={record.categories} />
                  </Col>
                  <Col span={2} role="cell">{capitalizeFirst(record.bank)}</Col>
                  <Col span={2} role="cell">
                    {typeEnumLabel[record.type as TypeEnum] ?? record.type}
                  </Col>
                  <Col span={6} role="cell">
                    {record.description}
                    <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                      {capitalizeFirst(record.metadata.owner.givenName ?? "")}
                    </Text>
                  </Col>
                  <Col span={2} role="cell" style={{ textAlign: "center" }}>{record.installments}</Col>
                  <Col span={4} role="cell" style={{ textAlign: "right" }}>
                    {record.typeIndicator}
                    <Text style={record.amountStyle}>{`${record.amountSign}$${Math.abs(record.amount).toFixed(2)}`}</Text>
                    <Tag style={{ marginLeft: 6 }}>{record.currency?.symbol ?? "-"}</Tag>
                  </Col>
                  <Col span={3} role="cell" style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <Flex align="center" justify="flex-end" wrap="nowrap" gap={4}>
                      <span style={{ width: 24, textAlign: "center", flexShrink: 0 }}>
                        {hasItems && (
                          <DownOutlined
                            onClick={() => onToggleExpand(record.id)}
                            rotate={isExpanded ? 180 : 0}
                            style={{
                              fontSize: 12,
                              color: token.colorTextSecondary,
                              cursor: "pointer",
                              transition: "transform 0.2s",
                            }}
                          />
                        )}
                      </span>
                      <MovementActionButtons record={record} onDelete={onDelete} />
                    </Flex>
                  </Col>
                </Row>

                {hasItems && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Collapse
                      ghost
                      bordered={false}
                      activeKey={isExpanded ? ["items"] : []}
                      items={[
                        {
                          key: "items",
                          collapsible: "disabled",
                          showArrow: false,
                          styles: {
                            header: { display: "none", padding: 0 },
                            body: { padding: 0 },
                          },
                          label: null,
                          children: <MovementItemsBreakdown items={record.items} />,
                        },
                      ]}
                    />
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
