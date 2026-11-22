import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import UserTypeOnboarding from "@/components/onboarding/UserTypeOnboarding";

describe("UserTypeOnboarding Volver", () => {
  it("sin onPrev no muestra Volver", () => {
    render(
      <ConfigProvider>
        <UserTypeOnboarding initialValues={{}} onNext={vi.fn()} />
      </ConfigProvider>,
    );
    expect(screen.queryByText("Volver")).not.toBeInTheDocument();
  });

  it("con onPrev muestra Volver y lo llama", async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    render(
      <ConfigProvider>
        <UserTypeOnboarding initialValues={{}} onNext={vi.fn()} onPrev={onPrev} />
      </ConfigProvider>,
    );
    await user.click(screen.getByText("Volver"));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });
});
