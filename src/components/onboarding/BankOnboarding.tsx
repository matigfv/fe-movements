import PlusOutlined from "@ant-design/icons/PlusOutlined";
import BankOutlined from "@ant-design/icons/BankOutlined";
import DeleteOutlined from "@ant-design/icons/DeleteOutlined";
import StarFilled from "@ant-design/icons/StarFilled";
import StarOutlined from "@ant-design/icons/StarOutlined";
import {
  AutoComplete,
  Button,
  Col,
  Empty,
  Flex,
  Form,
  Input,
  Row,
  Space,
  Tooltip,
  Typography,
  theme,
} from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { OnboardingBankEntry } from "@/apis/onboarding/OnboardingApi";
import { BANK_SUGGESTIONS } from "@/utils/onboardingSuggestions";

const { Text } = Typography;

interface Props {
  initialValues: { banksToAdd?: OnboardingBankEntry[] };
  onNext: (values: { banksToAdd: OnboardingBankEntry[] }) => void;
  onPrev: (values: { banksToAdd: OnboardingBankEntry[] }) => void;
  onFinishNow?: (values: { banksToAdd: OnboardingBankEntry[] }) => void;
}

export default function BankOnboarding({ initialValues, onNext, onPrev, onFinishNow }: Props) {
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const [form] = Form.useForm<{ description: string }>();
  const [banks, setBanks] = useState<OnboardingBankEntry[]>(
    initialValues.banksToAdd ?? [],
  );

  // Incluye el texto escrito pero aún no agregado, si no es vacío ni duplicado
  const collectBanks = () => {
    const pending = (
      (form.getFieldValue("description") as string | undefined) ?? ""
    )
      .trim()
      .toUpperCase();
    if (!pending || banks.some((b) => b.description === pending)) return banks;
    form.resetFields();
    return [...banks, { description: pending, isDefault: banks.length === 0 }];
  };

  const handleAdd = () => {
    form.validateFields().then(({ description }) => {
      const trimmed = description.trim().toUpperCase();
      if (!trimmed) return;
      if (banks.some((b) => b.description === trimmed)) {
        form.setFields([
          { name: "description", errors: [t("onboarding.common.duplicate")] },
        ]);
        return;
      }
      // El primero que se agrega es default automáticamente
      setBanks((prev) => [
        ...prev,
        { description: trimmed, isDefault: prev.length === 0 },
      ]);
      form.resetFields();
    }).catch(() => {});
  };

  const handleRemove = (description: string) => {
    setBanks((prev) => {
      const filtered = prev.filter((b) => b.description !== description);
      // Si borramos el default y quedan bancos, el primero pasa a ser default
      const hadDefault = prev.find((b) => b.description === description)?.isDefault;
      if (hadDefault && filtered.length > 0) {
        return filtered.map((b, i) => ({ ...b, isDefault: i === 0 }));
      }
      return filtered;
    });
  };

  const handleSetDefault = (description: string) => {
    setBanks((prev) =>
      prev.map((b) => ({ ...b, isDefault: b.description === description })),
    );
  };

  return (
    <Space orientation="vertical" style={{ width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Text type="secondary" style={{ display: "block" }}>
          {t("onboarding.bank.description1")}
        </Text>
        <Text type="secondary" style={{ display: "block" }}>
          {t("onboarding.bank.description2")}
        </Text>
      </div>

      <Form form={form} layout="vertical" onFinish={handleAdd}>
        <Row gutter={[12, 0]} align="middle">
          <Col flex="auto">
            <Form.Item
              name="description"
              style={{ margin: 0 }}
              rules={[
                { required: true, message: t("onboarding.bank.nameRequired") },
              ]}
            >
              <AutoComplete
                options={BANK_SUGGESTIONS.filter(
                  (b) => !banks.some((x) => x.description === b.toUpperCase()),
                ).map((b) => ({ value: b }))}
                filterOption={(input, option) =>
                  (option?.value as string).toLowerCase().includes(input.toLowerCase())
                }
              >
                <Input
                  placeholder={t("onboarding.bank.namePlaceholder")}
                  style={{ borderRadius: 10, height: 40 }}
                />
              </AutoComplete>
            </Form.Item>
          </Col>
          <Col>
            <Button
              icon={<PlusOutlined />}
              type="primary"
              htmlType="submit"
              style={{ height: 40, borderRadius: 10, fontWeight: 600 }}
            >
              {t("onboarding.bank.addButton")}
            </Button>
          </Col>
        </Row>
      </Form>

      {/* Lista de bancos agregados */}
      <div
        style={{
          minHeight: 80,
          padding: "12px 14px",
          borderRadius: 12,
          border: `1.5px dashed ${token.colorBorderSecondary}`,
          background: token.colorFillAlter,
        }}
      >
        {banks.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("onboarding.bank.emptyDescription")}
              </Text>
            }
            style={{ margin: "8px 0" }}
          />
        ) : (
          <Flex vertical gap={8}>
            {banks.map((bank) => (
              <div
                key={bank.description}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${bank.isDefault ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
                  background: bank.isDefault ? token.colorPrimaryBg : token.colorBgContainer,
                  transition: "all 0.2s ease",
                }}
              >
                <Flex align="center" gap={10}>
                  <BankOutlined
                    style={{
                      color: bank.isDefault ? token.colorPrimary : token.colorTextSecondary,
                      fontSize: 16,
                    }}
                  />
                  <Text strong style={{ fontSize: 14 }}>
                    {bank.description.charAt(0) + bank.description.slice(1).toLowerCase()}
                  </Text>
                  {bank.isDefault && (
                    <span
                      style={{
                        background: token.colorPrimaryBg,
                        borderRadius: 20,
                        color: token.colorText,
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: "0.5px",
                        padding: "2px 9px",
                        textTransform: "uppercase",
                        lineHeight: "18px",
                      }}
                    >
                      {t("onboarding.common.defaultBadge")}
                    </span>
                  )}
                </Flex>
                <Flex gap={4}>
                  <Tooltip
                    title={
                      bank.isDefault
                        ? t("onboarding.bank.starTooltipDefault")
                        : t("onboarding.bank.starTooltipSetDefault")
                    }
                  >
                    <Button
                      type="text"
                      size="small"
                      aria-label={t("onboarding.bank.starAriaLabel", {
                        name: bank.description,
                      })}
                      disabled={bank.isDefault}
                      onClick={() => handleSetDefault(bank.description)}
                      icon={
                        bank.isDefault
                          ? <StarFilled style={{ color: token.colorWarning }} />
                          : <StarOutlined style={{ color: token.colorTextQuaternary }} />
                      }
                    />
                  </Tooltip>
                  <Tooltip title={t("onboarding.bank.deleteTooltip")}>
                    <Button
                      type="text"
                      size="small"
                      danger
                      aria-label={t("onboarding.bank.deleteAriaLabel", {
                        name: bank.description,
                      })}
                      onClick={() => handleRemove(bank.description)}
                      icon={<DeleteOutlined />}
                    />
                  </Tooltip>
                </Flex>
              </div>
            ))}
          </Flex>
        )}
      </div>

      <Text
        type="secondary"
        style={{ fontSize: 12, display: "block", textAlign: "center" }}
      >
        {t("onboarding.bank.footerNote")}
      </Text>

      <Row gutter={[16, 10]}>
        <Col xs={12}>
          <Button block type="default" onClick={() => onPrev({ banksToAdd: collectBanks() })}>
            {t("onboarding.backButton")}
          </Button>
        </Col>
        <Col xs={12}>
          <Button
            block
            type="primary"
            onClick={() => onNext({ banksToAdd: collectBanks() })}
          >
            {t("onboarding.nextButton")}
          </Button>
        </Col>
      </Row>
      {onFinishNow && (
        <Button
          type="text"
          block
          onClick={() => onFinishNow({ banksToAdd: collectBanks() })}
        >
          {t("onboarding.finishNowButton")}
        </Button>
      )}
    </Space>
  );
}
