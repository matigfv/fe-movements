import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "@/apis/auth/AuthGate";

const login = vi.fn();
let keycloakState: { initialized: boolean; authenticated: boolean };

vi.mock("@react-keycloak/web", () => ({
  useKeycloak: () => ({
    initialized: keycloakState.initialized,
    keycloak: { authenticated: keycloakState.authenticated, login },
  }),
}));

function setPath(path: string) {
  window.history.pushState({}, "", path);
}

describe("AuthGate", () => {
  beforeEach(() => {
    login.mockClear();
    setPath("/");
  });

  it("renders the app when there is a session", () => {
    keycloakState = { initialized: true, authenticated: true };
    render(
      <AuthGate>
        <div>app</div>
      </AuthGate>,
    );
    expect(screen.getByText("app")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("shows the landing at / without a session, with a login button only", async () => {
    keycloakState = { initialized: true, authenticated: false };
    render(
      <AuthGate>
        <div>app</div>
      </AuthGate>,
    );
    expect(screen.queryByText("app")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /regist/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Iniciar sesión" })[0]);
    expect(login).toHaveBeenCalledWith({ redirectUri: `${window.location.origin}/` });
  });

  it("sends visitors of any other route straight to the login", () => {
    keycloakState = { initialized: true, authenticated: false };
    setPath("/movements");
    render(
      <AuthGate>
        <div>app</div>
      </AuthGate>,
    );
    expect(screen.queryByText("app")).not.toBeInTheDocument();
    expect(login).toHaveBeenCalledWith({ redirectUri: window.location.href });
  });
});
