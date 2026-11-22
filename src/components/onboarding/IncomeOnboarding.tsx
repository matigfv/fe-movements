import {
  Alert,
  Button,
  Col,
  Form,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
} from "antd";
import DollarOutlined from "@ant-design/icons/DollarOutlined";
import { useTranslation } from "react-i18next";
import type { OnboardingBankEntry, OnboardingCurrencyEntry, OnboardingForm, OnboardingIngresoForm, OnboardingWorkspaceEntry } from "@/apis/onboarding/OnboardingApi";
import { getEntityLabels } from "@/utils/entityLabels";
import { WorkspaceEnum } from "@/enums/WorkspaceEnum";

const { Text } = Typography;

interface Props {
  initialValues: Partial<OnboardingForm>;
  /** Values typed in this step before going back, restored when the user returns. */
  draft?: Partial<OnboardingIngresoForm>;
  onFinish: (values: OnboardingIngresoForm) => void;
  onPrev: (values: Partial<OnboardingIngresoForm>) => void;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

export default function IncomeOnboarding({
  initialValues,
  draft,
  onFinish,
  onPrev,
  isLoading,
  hasError,
  errorMessage,
}: Props) {
  const [form] = Form.useForm<OnboardingIngresoForm>();
  const { t } = useTranslation();
  const labels = getEntityLabels(initialValues.userType ?? null, t);

  // Usamos los bancos, monedas y workspaces ingresados en los pasos anteriores (si los hay)
  const banksToAdd: OnboardingBankEntry[] = initialValues.banksToAdd ?? [];
  const currenciesToAdd: OnboardingCurrencyEntry[] = initialValues.currenciesToAdd ?? [];
  const workspacesToAddOptions: OnboardingWorkspaceEntry[] = (
    initialValues.workspacesToAdd || []
  ).filter((w) => w.name && w.name.trim());

  // Default bank / workspace pre-seleccionados si hay uno marcado como default
  const defaultBank = banksToAdd.find((b) => b.isDefault)?.description;
  const defaultWorkspaceName =
    workspacesToAddOptions.find((w) => w.isDefault)?.name ?? workspacesToAddOptions[0]?.name;

  // Finalizar: los campos son opcionales, pero un monto necesita su moneda (ver regla de `currency`)
  const handleSubmit = () => {
    form
      .validateFields()
      .then(() => onFinish(form.getFieldsValue()))
      .catch(() => {});
  };

  const recapParts = [
    t("onboarding.income.recapWorkspaces", { count: Math.max(workspacesToAddOptions.length, 1) }),
    ...[
      ["recapCategories", (initialValues.categoriesToAdd ?? []).length],
      ["recapBanks", banksToAdd.length],
      ["recapCurrencies", currenciesToAdd.length],
    ]
      .filter(([, count]) => (count as number) > 0)
      .map(([key, count]) => t(`onboarding.income.${key}`, { count: count as number })),
  ];
  const recap = `${t("onboarding.income.recapPrefix")} ${recapParts.join(" · ")}`;

  return (
    <Space orientation="vertical" style={{ width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Text type="secondary" style={{ display: "block" }}>
          {labels.ingresoOnboardingDescription}
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{ ...initialValues, bank: defaultBank, ...draft }}
      >
        <Row gutter={[0, 0]}>
          <Col xs={24}>
            <Form.Item
              name="bank"
              label={<Text strong>{t("onboarding.income.bankLabel")}</Text>}
            >
              <Select placeholder={t("onboarding.income.bankPlaceholder")}>
                {banksToAdd.length > 0
                  ? banksToAdd.map((bank) => (
                      <Select.Option key={bank.description} value={bank.description}>
                        {bank.description.charAt(0) + bank.description.slice(1).toLowerCase()}
                      </Select.Option>
                    ))
                  : null}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item
              name="currency"
              label={<Text strong>{t("onboarding.income.currencyLabel")}</Text>}
              dependencies={["amount"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, value) =>
                    getFieldValue("amount") != null && !value
                      ? Promise.reject(new Error(t("onboarding.income.currencyRequired")))
                      : Promise.resolve(),
                }),
              ]}
            >
              <Select placeholder={t("onboarding.income.currencyPlaceholder")}>
                {currenciesToAdd.map((currency) => (
                  <Select.Option key={currency.symbol} value={currency.symbol}>
                    {currency.symbol} — {currency.description}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item
              name="amount"
              label={<Text strong>{labels.ingresoAmountLabel}</Text>}
            >
              <InputNumber
                precision={2}
                placeholder="50000"
                prefix={<DollarOutlined />}
                style={{ width: "100%" }}
                controls={false}
              />
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item
              name="accountToAdd"
              label={<Text strong>{labels.workspace}</Text>}
              initialValue={defaultWorkspaceName ?? WorkspaceEnum.DEFAULT}
            >
              {workspacesToAddOptions.length > 0 ? (
                <Select
                  placeholder={t("onboarding.income.workspacePlaceholder")}
                  options={workspacesToAddOptions.map((w) => ({ label: w.name, value: w.name }))}
                />
              ) : (
                <Select
                  disabled
                  options={[
                    {
                      value: WorkspaceEnum.DEFAULT,
                      label: t("onboarding.income.workspaceDefaultOption", {
                        workspace: labels.workspaceSingular,
                      }),
                    },
                  ]}
                />
              )}
            </Form.Item>
          </Col>
        </Row>

        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4, textAlign: "center" }}>
          {t("onboarding.income.footerNote")}
        </Text>
        <Text style={{ fontSize: 13, display: "block", marginBottom: 12, textAlign: "center" }}>
          {recap}
        </Text>

        {hasError && (
          <Alert
            type="error"
            showIcon
            title={errorMessage ?? t("onboarding.income.submitError")}
            style={{ marginBottom: 12 }}
          />
        )}

        <Row gutter={[16, 10]}>
          <Col xs={12}>
            <Button
              block
              type="default"
              onClick={() => onPrev(form.getFieldsValue())}
              disabled={isLoading}
            >
              {t("onboarding.backButton")}
            </Button>
          </Col>
          <Col xs={12}>
            <Button block type="primary" onClick={handleSubmit} loading={isLoading}>
              {hasError
                ? t("onboarding.income.retryButton")
                : t("onboarding.income.finishButton")}
            </Button>
          </Col>
        </Row>
      </Form>
    </Space>
  );
}
