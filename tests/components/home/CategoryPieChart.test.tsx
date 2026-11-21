import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CategoryPieChart from "@/components/home/CategoryPieChart";
import { CurrencyEnum } from "@/enums/CurrencyEnum";

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
