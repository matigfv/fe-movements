import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Card, Col, ConfigProvider, Grid, message, Row, Steps, Typography } from "antd";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import IncomeOnboarding from "@/components/onboarding/IncomeOnboarding";
import IntroOnboarding from "@/components/onboarding/IntroOnboarding";
import WorkspaceOnboarding from "@/components/onboarding/WorkspaceOnboarding";
import CategoryOnboarding from "@/components/onboarding/CategoryOnboarding";
import BankOnboarding from "@/components/onboarding/BankOnboarding";
import CurrencyOnboarding from "@/components/onboarding/CurrencyOnboarding";
import ReadyOnboarding from "@/components/onboarding/ReadyOnboarding";
import {
  finishOnboarding,
  type OnboardingForm,
  type OnboardingIngresoForm,
} from "@/apis/onboarding/OnboardingApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { onBoardingGuard } from "@/apis/auth/onBoardingGuard";
import { useKeycloak } from "@react-keycloak/web";
import UserTypeOnboarding from "@/components/onboarding/UserTypeOnboarding";
import { WorkspaceEnum } from "@/enums/WorkspaceEnum";
import { UserTypeEnum } from "@/enums/UserTypeEnum";
import { CURRENT_USER_QUERY_KEY } from "@/apis/hooks/useCurrentUser";
import { getEntityLabels } from "@/utils/entityLabels";
import { useTheme } from "@/apis/theme/ThemeContext";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

type StepKey =
  | "intro"
  | "profile"
  | "ready"
  | "workspaces"
  | "categories"
  | "banks"
  | "currency"
  | "income";

const CUSTOM_STEPS: StepKey[] = ["workspaces", "categories", "banks", "currency"];
const STORAGE_KEY = "onboarding.draft";

interface Draft {
  stepKey: StepKey;
  customize: boolean;
  formData: Partial<OnboardingForm>;
  incomeDraft: Partial<OnboardingIngresoForm>;
}

// Un refresh o una interrupción no deberían borrar lo que el usuario ya cargó.
function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function saveDraft(draft: Draft) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // sin storage disponible: el asistente funciona igual, solo no se restaura
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // nada que limpiar
  }
}

export const Route = createFileRoute("/onboarding")({
  beforeLoad: onBoardingGuard,
  component: RouteComponent,
});

function RouteComponent() {
  const { keycloak } = useKeycloak();
  const queryClient = useQueryClient();
  const screens = useBreakpoint();
  const { isDark } = useTheme();
  const [saved] = useState(loadDraft);
  const [customize, setCustomize] = useState(saved?.customize ?? false);
  const [stepKey, setStepKey] = useState<StepKey>(saved?.stepKey ?? "intro");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [formData, setFormData] = useState<Partial<OnboardingForm>>(saved?.formData ?? {});
  const [incomeDraft, setIncomeDraft] = useState<Partial<OnboardingIngresoForm>>(
    saved?.incomeDraft ?? {},
  );
  const router = useRouter();
  const { t } = useTranslation();
  const labels = getEntityLabels(formData.userType ?? null, t);

  // "Todo listo" es el camino corto: termina ahí. "Personalizar" suma los pasos de configuración.
  const keys: StepKey[] = customize
    ? ["intro", "profile", "ready", ...CUSTOM_STEPS, "income"]
    : ["intro", "profile", "ready"];
  const currentStep = Math.max(keys.indexOf(stepKey), 0);

  // En Personalizar, "Todo listo" es la bifurcación, no un hito: no aparece en la barra de pasos.
  // Si el usuario vuelve a esa pantalla, la barra queda marcada en Perfil.
  const displayKeys = customize ? keys.filter((k) => k !== "ready") : keys;
  const displayStep = Math.max(
    displayKeys.indexOf(stepKey === "ready" ? "profile" : stepKey),
    0,
  );

  const goTo = (key: StepKey, dir: "forward" | "back", next: Partial<Draft> = {}) => {
    setDirection(dir);
    setStepKey(key);
    saveDraft({ stepKey: key, customize, formData, incomeDraft, ...next });
  };

  const handleNext = (values: Partial<OnboardingForm>) => {
    const merged = { ...formData, ...values };
    setFormData(merged);
    goTo(keys[currentStep + 1], "forward", { formData: merged });
  };

  // Volver conserva lo que el usuario cargó en el paso que deja.
  const handlePrev = (values?: Partial<OnboardingForm>) => {
    const merged = { ...formData, ...values };
    if (values) setFormData(merged);
    goTo(keys[currentStep - 1], "back", { formData: merged });
  };

  const handleCustomize = () => {
    setCustomize(true);
    setDirection("forward");
    setStepKey("workspaces");
    saveDraft({ stepKey: "workspaces", customize: true, formData, incomeDraft });
  };

  const finishMutation = useMutation({
    mutationFn: (onboardingForm: OnboardingForm) => finishOnboarding(onboardingForm),
    onSuccess: async () => {
      clearDraft();
      try {
        await keycloak.updateToken(0);
      } catch {
        // token refresh no crítico, continuar igual
      }
      await queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      // Actualizamos el contexto del router de forma síncrona antes de navegar:
      // si esperáramos a que el efecto de RouterWithAuth (App.tsx) detecte el
      // refetch de useCurrentUser, hay una carrera en la que el guard de "/"
      // todavía ve firstLogin=true y redirige de nuevo a /onboarding.
      router.update({
        context: {
          ...router.options.context,
          auth: { ...router.options.context.auth, firstLogin: false },
        },
      });
      router.navigate({ to: "/", replace: true });
      message.success(t("onboarding.finishSuccess"));
    },
  });

  // Sin respuesta del servidor es un problema de conexión; con respuesta, el backend rechazó los datos.
  const submitErrorMessage =
    finishMutation.error && isAxiosError(finishMutation.error) && finishMutation.error.response
      ? t("onboarding.income.submitErrorServer")
      : undefined;

  const submit = (values: Partial<OnboardingIngresoForm>, data: Partial<OnboardingForm> = formData) => {
    const newGroups = (data.workspacesToAdd || []).filter(
      (w) => w.name && w.name.trim(),
    );
    if (newGroups.length === 0) {
      newGroups.push({ name: WorkspaceEnum.DEFAULT, isDefault: true });
    }
    const selectedGroup =
      values.accountToAdd ||
      newGroups.find((w) => w.isDefault)?.name ||
      newGroups[0].name;

    const finalData: OnboardingForm = {
      workspacesToAdd: newGroups,
      userType: data.userType ?? UserTypeEnum.PERSONAL,
      categoriesToAdd: data.categoriesToAdd ?? [],
      banksToAdd: data.banksToAdd ?? [],
      currenciesToAdd: data.currenciesToAdd ?? [],
      onBoardingAmount: {
        amount: values.amount as number,
        bank: values.bank as string,
        currency: values.currency as string,
        accountToAdd: selectedGroup,
      },
    };
    setFormData(finalData);
    finishMutation.mutate(finalData);
  };

  // "Terminar ahora con esto": envía lo cargado hasta acá, con valores por defecto para el resto.
  const handleFinishNow = (values: Partial<OnboardingForm>) => {
    const merged = { ...formData, ...values };
    setFormData(merged);
    submit({}, merged);
  };

  const stepContent: Record<StepKey, { title: string; content: React.ReactNode }> = {
    intro: {
      title: t("onboarding.steps.introTitle"),
      content: <IntroOnboarding onNext={handleNext} />,
    },
    profile: {
      title: t("onboarding.steps.profileTitle"),
      content: <UserTypeOnboarding
          initialValues={formData}
          onPrev={() => handlePrev()}
          onNext={handleNext}
        />,
    },
    ready: {
      title: t("onboarding.steps.readyTitle"),
      content: (
        <ReadyOnboarding
          initialValues={formData}
          onPrev={() => handlePrev()}
          onCustomize={handleCustomize}
          onFinish={() => submit({})}
          isLoading={finishMutation.isPending}
          hasError={finishMutation.isError}
          errorMessage={submitErrorMessage}
        />
      ),
    },
    workspaces: {
      title: t("onboarding.steps.workspacesTitle"),
      content: (
        <WorkspaceOnboarding
          initialValues={formData}
          onPrev={handlePrev}
          onNext={handleNext}
          onFinishNow={handleFinishNow}
        />
      ),
    },
    categories: {
      title: t("onboarding.steps.categoriesTitle"),
      content: (
        <CategoryOnboarding
          initialValues={formData}
          onPrev={handlePrev}
          onNext={handleNext}
          onFinishNow={handleFinishNow}
        />
      ),
    },
    banks: {
      title: t("onboarding.steps.banksTitle"),
      content: (
        <BankOnboarding
          initialValues={formData}
          onPrev={handlePrev}
          onNext={handleNext}
          onFinishNow={handleFinishNow}
        />
      ),
    },
    currency: {
      title: t("onboarding.steps.currencyTitle"),
      content: (
        <CurrencyOnboarding
          initialValues={formData}
          onPrev={handlePrev}
          onNext={handleNext}
          onFinishNow={handleFinishNow}
        />
      ),
    },
    income: {
      title: t("onboarding.steps.incomeTitle"),
      content: (
        <IncomeOnboarding
          initialValues={formData}
          draft={incomeDraft}
          onPrev={(values) => {
            setIncomeDraft(values);
            goTo(keys[currentStep - 1], "back", { incomeDraft: values });
          }}
          onFinish={submit}
          isLoading={finishMutation.isPending}
          hasError={finishMutation.isError}
          errorMessage={submitErrorMessage}
        />
      ),
    },
  };

  const isMobile = !screens.md;

  return (
    <Row justify="center">
      <Col xs={24} sm={22} md={19} lg={16}>
        {/* Los placeholders por defecto de Ant Design (25% de opacidad) no llegan a 4.5:1. */}
        <ConfigProvider
          theme={{
            token: {
              colorTextPlaceholder: isDark ? "rgba(255, 255, 255, 0.55)" : "rgba(0, 0, 0, 0.55)",
            },
          }}
        >
        <Card
          style={{
            margin: 20,
            paddingInline: 20,
            maxWidth: 1040,
            animation: "onboarding-card-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {currentStep > 0 && (
            <div style={{ textAlign: "center", marginBottom: 30 }}>
              <Title level={2} style={{ margin: 0 }}>{t("onboarding.steps.welcomeTitle")}</Title>
              <Text type="secondary">
                {labels.onboardingBienvenida}
              </Text>
            </div>
          )}

          {isMobile ? (
            <Text strong style={{ display: "block", textAlign: "center", marginBottom: 24 }}>
              {t("onboarding.steps.stepCounter", {
                current: displayStep + 1,
                total: displayKeys.length,
              })}
              {" · "}
              {stepContent[stepKey].title}
            </Text>
          ) : (
            <Steps
              current={displayStep}
              items={displayKeys.map((k) => ({ title: stepContent[k].title }))}
              style={{ marginBottom: 40 }}
              size="small"
              titlePlacement="vertical"
            />
          )}

          <div
            key={stepKey}
            className={direction === "forward" ? "step-enter-right" : "step-enter-left"}
          >
            {stepContent[stepKey].content}
          </div>
        </Card>
        </ConfigProvider>
      </Col>
    </Row>
  );
}
