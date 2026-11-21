import { Button, Table } from "antd";
import type { TableColumnsType } from "antd";
import { useTranslation } from "react-i18next";

type Row = Record<string, string | number>;

type ChartViewToggleProps = {
  showingTable: boolean;
  onToggle: () => void;
};

/** Link-style button that swaps a chart for its data table (and back). */
export function ChartViewToggle({ showingTable, onToggle }: ChartViewToggleProps) {
  const { t } = useTranslation();
  return (
    <Button type="link" size="small" onClick={onToggle}>
      {t(showingTable ? "home.chartShowChart" : "home.chartShowTable")}
    </Button>
  );
}

type ChartDataTableProps = {
  label: string;
  columns: TableColumnsType<Row>;
  rows: Row[];
  rowKey: string;
};

/** Small table twin of a chart; the region name tells assistive tech what it mirrors. */
export default function ChartDataTable({
  label,
  columns,
  rows,
  rowKey,
}: ChartDataTableProps) {
  return (
    <div role="region" aria-label={label}>
      <Table<Row>
        size="small"
        columns={columns}
        dataSource={rows}
        rowKey={rowKey}
        pagination={false}
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}
