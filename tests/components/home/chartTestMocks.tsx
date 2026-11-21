import type { ReactNode } from "react";

// jsdom has no layout, so recharts renders nothing. These stubs render children and
// call the Tooltip formatter so tests can assert how amounts are printed.
const passthrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;

export const rechartsStub = {
  ResponsiveContainer: passthrough,
  PieChart: passthrough,
  LineChart: passthrough,
  Pie: passthrough,
  Cell: () => null,
  Legend: () => null,
  Line: () => null,
  CartesianGrid: () => null,
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
