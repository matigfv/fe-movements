import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LandingPage from "@/components/landing/LandingPage";

describe("LandingPage", () => {
  it("has one h1, h2 feature titles (no skipped levels) and only login actions", async () => {
    const onLogin = vi.fn();
    render(<LandingPage onLogin={onLogin} />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryAllByRole("heading", { level: 4 })).toHaveLength(0);
    expect(screen.getByRole("heading", { level: 2, name: "Importá el PDF de tu banco" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /regist/i })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    await userEvent.click(screen.getByRole("button", { name: "Entrar a mi cuenta" }));
    expect(onLogin).toHaveBeenCalledTimes(2);
  });
});
