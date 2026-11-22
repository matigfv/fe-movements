import { useEffect, type ReactNode } from "react";
import { useKeycloak } from "@react-keycloak/web";
import LandingPage from "@/components/landing/LandingPage";

/**
 * Keycloak runs with `check-sso`, so visitors without a session reach the app. "/" shows the public
 * landing; any other route sends them straight to the login and comes back to it afterwards.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { keycloak, initialized } = useKeycloak();
  const needsLogin = initialized && !keycloak.authenticated;
  const isLanding = window.location.pathname === "/";

  useEffect(() => {
    if (needsLogin && !isLanding) {
      void keycloak.login({ redirectUri: window.location.href });
    }
  }, [needsLogin, isLanding, keycloak]);

  if (!needsLogin) return <>{children}</>;
  if (isLanding) {
    return (
      <LandingPage
        onLogin={() => void keycloak.login({ redirectUri: window.location.origin + "/" })}
      />
    );
  }
  return null;
}
