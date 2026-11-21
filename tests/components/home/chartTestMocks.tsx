import type { ReactNode } from "react";

// jsdom has no layout, so recharts renders nothing. These stubs render children and
// call the Tooltip formatter so tests can assert how amounts are printed.
const passthrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;

export const rechartsStub = {
  ResponsiveContainer: passthrough,
  PieChart: passthrough,
  LineChart: passthrough,
  Pie: passthrough,
  Cell: ({ fill }: { fill?: string }) => <i data-testid="cell" data-fill={fill} />,
  Legend: () => null,
  Line: ({ dataKey, stroke }: { dataKey: string; stroke?: string }) => (
    <i data-testid={`line-${dataKey}`} data-stroke={stroke} />
  ),
  // Fixed fake geometry: y = 300 - value / 10, so series with small values end close together.
  usePlotArea: () => ({ x: 0, y: 0, width: 500, height: 300 }),
  useXAxisScale: () => () => 400,
  useYAxisScale: () => (v: number) => 300 - v / 10,
  CartesianGrid: () => null,
  ReferenceLine: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: ({
    formatter,
  }: {
    formatter: (v: number, n: string, item: { dataKey: string }) => unknown;
  }) => (
    <div data-testid="tooltip">
      {String(formatter(1234, "Hogar", { dataKey: "EUR_spent" }))}
    </div>
  ),
};
