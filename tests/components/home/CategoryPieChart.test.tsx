import { render, screen } from "@testing-library/react";
import { ConfigProvider, theme } from "antd";
import { describe, it, expect, vi } from "vitest";
import CategoryPieChart from "@/components/home/CategoryPieChart";
import { CurrencyEnum } from "@/enums/CurrencyEnum";
import { getChartColors } from "@/utils/chartTheme";

vi.mock("recharts", async () => (await import("./chartTestMocks")).rechartsStub);

describe("CategoryPieChart — context label", () => {
  it("shows the active currency and the month it covers", () => {
    render(
      <CategoryPieChart
        data={[]}
        isFetching={false}
        filters={{
          currency: CurrencyEnum.ARS,
          dates: [new Date(2026, 9, 1), new Date(2026, 9, 31)],
        }}
      />,
    );

    expect(screen.getByText("ARS · octubre 2026")).toBeInTheDocument();
  });

  it("shows the full range when the dates span several months", () => {
    render(
      <CategoryPieChart
        data={[]}
        isFetching={false}
        filters={{
          currency: CurrencyEnum.USD,
          dates: [new Date(2026, 8, 1), new Date(2026, 9, 31)],
        }}
      />,
    );

    expect(
      screen.getByText("USD · 01/09/2026 – 31/10/2026"),
    ).toBeInTheDocument();
  });
});

describe("CategoryPieChart - currency symbol", () => {
  it("prints the active currency in the center total and tooltip, never a bare $", () => {
    const { container } = render(
      <CategoryPieChart
        data={[{ name: "Hogar", value: 1234 }]}
        isFetching={false}
        filters={{
          currency: CurrencyEnum.EUR,
          dates: [new Date(2026, 9, 1), new Date(2026, 9, 31)],
        }}
      />,
    );

    expect([...container.querySelectorAll("text")].map((n) => n.textContent)).toContain("EUR 1.234");
    expect(screen.getByTestId("tooltip").textContent).toContain("EUR 1.234");
    expect(container.textContent).not.toContain("$");
  });
});

describe("CategoryPieChart - theme colors", () => {
  const filters = {
    currency: CurrencyEnum.ARS,
    dates: [new Date(2026, 9, 1), new Date(2026, 9, 31)] as [Date, Date],
  };

  const fillsUnder = (algorithm: typeof theme.darkAlgorithm) => {
    const { unmount } = render(
      <ConfigProvider theme={{ algorithm }}>
        <CategoryPieChart
          data={[{ name: "Hogar", value: 10 }, { name: "Ocio", value: 5 }]}
          isFetching={false}
          filters={filters}
        />
      </ConfigProvider>,
    );
    const fills = screen.getAllByTestId("cell").map((c) => c.getAttribute("data-fill"));
    unmount();
    return fills;
  };

  it("slice fills come from the active theme tokens, in light and dark", () => {
    const light = theme.getDesignToken({ algorithm: theme.defaultAlgorithm });
    const dark = theme.getDesignToken({ algorithm: theme.darkAlgorithm });

    const lightFills = fillsUnder(theme.defaultAlgorithm);
    const darkFills = fillsUnder(theme.darkAlgorithm);

    expect(lightFills).toEqual(getChartColors(light).slice(0, 2));
    expect(darkFills).toEqual(getChartColors(dark).slice(0, 2));
    expect(darkFills).not.toEqual(lightFills);
  });
});
