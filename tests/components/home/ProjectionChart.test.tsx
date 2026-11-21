import { render, screen } from "@testing-library/react";
import { ConfigProvider, theme } from "antd";
import { describe, it, expect, vi } from "vitest";
import ProjectionChart from "@/components/home/ProjectionChart";

vi.mock("recharts", async () => (await import("./chartTestMocks")).rechartsStub);
vi.mock("@/apis/hooks/useSettings", () => ({
  useUserDefault: () => ({ data: { value: "w1" } }),
}));
vi.mock("@/apis/hooks/useProjection", () => ({
  useProjection: () => ({
    isFetching: false,
    data: {
      currency: "ARS",
      averageMonthlyNet: 100,
      trailingMonths: 3,
      projectedPoints: [
        { monthsOut: 0, projectedBalance: 10 },
        { monthsOut: 1, projectedBalance: 20 },
      ],
    },
  }),
}));

describe("ProjectionChart - theme colors", () => {
  const strokeUnder = (algorithm: typeof theme.darkAlgorithm) => {
    const { unmount } = render(
      <ConfigProvider theme={{ algorithm }}>
        <ProjectionChart />
      </ConfigProvider>,
    );
    const stroke = screen.getByTestId("line-balance").getAttribute("data-stroke");
    unmount();
    return stroke;
  };

  it("trend line uses the success token of the active theme", () => {
    const light = theme.getDesignToken({ algorithm: theme.defaultAlgorithm });
    const dark = theme.getDesignToken({ algorithm: theme.darkAlgorithm });

    expect(strokeUnder(theme.defaultAlgorithm)).toBe(light.colorSuccess);
    expect(strokeUnder(theme.darkAlgorithm)).toBe(dark.colorSuccess);
  });
});
