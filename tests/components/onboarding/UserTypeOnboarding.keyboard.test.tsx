import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import UserTypeOnboarding from "@/components/onboarding/UserTypeOnboarding";

describe("UserTypeOnboarding keyboard", () => {
  it("las opciones son radios enfocables y se eligen con Enter y Espacio", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(
      <ConfigProvider>
        <UserTypeOnboarding initialValues={{}} onNext={onNext} />
      </ConfigProvider>,
    );

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAttribute("aria-checked", "true");

    radios[1].focus();
    await user.keyboard("{Enter}");
    expect(radios[1]).toHaveAttribute("aria-checked", "true");

    radios[0].focus();
    await user.keyboard(" ");
    expect(radios[0]).toHaveAttribute("aria-checked", "true");

    radios[1].focus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByText("Siguiente"));
    await waitFor(() => expect(onNext).toHaveBeenCalledWith({ userType: "ENTERPRISE" }));
  });
});
