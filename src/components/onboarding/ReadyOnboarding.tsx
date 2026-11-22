import { Alert, Button, Col, Row, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { OnboardingForm } from "@/apis/onboarding/OnboardingApi";
import { getEntityLabels } from "@/utils/entityLabels";

const { Title, Paragraph, Text } = Typography;

interface Props {
  initialValues: Partial<OnboardingForm>;
  onFinish: () => void;
  onCustomize: () => void;
  onPrev: () => void;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

/** Short path: shows what will be created by default and lets the user finish or customize. */
export default function ReadyOnboarding({
  initialValues,
  onFinish,
  onCustomize,
  onPrev,
  isLoading,
  hasError,
  errorMessage,
}: Props) {
  const { t } = useTranslation();
  const labels = getEntityLabels(initialValues.userType ?? null, t);

  return (
    <Space orientation="vertical" style={{ width: "100%" }} size={16}>
      <div style={{ textAlign: "center" }}>
        <Title level={3} style={{ margin: "0 0 8px" }}>
          {t("onboarding.ready.title")}
        </Title>
        <Text type="secondary">{t("onboarding.ready.intro")}</Text>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <Paragraph style={{ marginBottom: 8 }}>
          {t("onboarding.ready.workspaceLine", { workspace: labels.workspaceSingular })}{" "}
          <Text type="secondary">{labels.workspaceDescription}</Text>
        </Paragraph>
        <Paragraph style={{ marginBottom: 8 }}>{t("onboarding.ready.defaultsLine")}</Paragraph>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {t("onboarding.ready.principalHelp")}
        </Paragraph>
      </div>

      {hasError && (
        <Alert type="error" showIcon title={errorMessage ?? t("onboarding.income.submitError")} />
      )}

      <Row gutter={[16, 10]}>
        <Col xs={24} sm={8}>
          <Button block onClick={onPrev} disabled={isLoading}>
            {t("onboarding.backButton")}
          </Button>
        </Col>
        <Col xs={24} sm={8}>
          <Button block onClick={onCustomize} disabled={isLoading}>
            {t("onboarding.ready.customizeButton")}
          </Button>
        </Col>
        <Col xs={24} sm={8}>
          <Button block type="primary" onClick={onFinish} loading={isLoading}>
            {hasError
              ? t("onboarding.income.retryButton")
              : t("onboarding.ready.continueButton")}
          </Button>
        </Col>
      </Row>

      <Text type="secondary" style={{ fontSize: 12, display: "block", textAlign: "center" }}>
        {t("onboarding.ready.customizeHelp")}
      </Text>
    </Space>
  );
}
