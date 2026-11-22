import PlusOutlined from "@ant-design/icons/PlusOutlined";
import AppstoreOutlined from "@ant-design/icons/AppstoreOutlined";
import DeleteOutlined from "@ant-design/icons/DeleteOutlined";
import StarFilled from "@ant-design/icons/StarFilled";
import StarOutlined from "@ant-design/icons/StarOutlined";
import {
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
import type { OnboardingForm, OnboardingWorkspaceEntry } from "@/apis/onboarding/OnboardingApi";
import { getEntityLabels } from "@/utils/entityLabels";

const { Text } = Typography;

const NAME_REGEX = /^[\p{L}\p{N}\s&/.\-+]+$/u;

interface Props {
  initialValues: Partial<OnboardingForm>;
  onNext: (values: Pick<OnboardingForm, "workspacesToAdd">) => void;
  onPrev: (values: Pick<OnboardingForm, "workspacesToAdd">) => void;
  onFinishNow?: (values: Pick<OnboardingForm, "workspacesToAdd">) => void;
}

export default function WorkspaceOnboarding({ initialValues, onNext, onPrev, onFinishNow }: Props) {
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const [form] = Form.useForm<{ name: string }>();
  const labels = getEntityLabels(initialValues.userType ?? null, t);
  const [workspaces, setWorkspaces] = useState<OnboardingWorkspaceEntry[]>(
    initialValues.workspacesToAdd ?? [],
  );

  const isDuplicate = (name: string) =>
    workspaces.some((w) => w.name.toLowerCase() === name.toLowerCase());

  // Incluye el texto escrito pero aún no agregado, si es válido y no duplicado
  const collectWorkspaces = () => {
    const pending = ((form.getFieldValue("name") as string | undefined) ?? "").trim();
    if (!pending || !NAME_REGEX.test(pending) || isDuplicate(pending)) {
      return workspaces;
    }
    form.resetFields();
    return [...workspaces, { name: pending, isDefault: workspaces.length === 0 }];
  };

  const handleAdd = () => {
    form.validateFields().then(({ name }) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (isDuplicate(trimmed)) {
        form.setFields([
          { name: "name", errors: [t("onboarding.common.duplicate")] },
        ]);
        return;
      }
      // El primero que se agrega es default automáticamente
      setWorkspaces((prev) => [
        ...prev,
        { name: trimmed, isDefault: prev.length === 0 },
      ]);
      form.resetFields();
    }).catch(() => {});
  };

  const handleRemove = (name: string) => {
    setWorkspaces((prev) => {
      const filtered = prev.filter((w) => w.name !== name);
      // Si borramos el default y quedan workspaces, el primero pasa a ser default
      const hadDefault = prev.find((w) => w.name === name)?.isDefault;
      if (hadDefault && filtered.length > 0) {
        return filtered.map((w, i) => ({ ...w, isDefault: i === 0 }));
      }
      return filtered;
    });
  };

  const handleSetDefault = (name: string) => {
    setWorkspaces((prev) =>
      prev.map((w) => ({ ...w, isDefault: w.name === name })),
    );
  };

  const handleSubmit = () => {
    onNext({ workspacesToAdd: collectWorkspaces() });
  };

  const handlePrev = () => {
    onPrev({ workspacesToAdd: collectWorkspaces() });
  };

  return (
    <Space orientation="vertical" style={{ width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Text type="secondary" style={{ display: "block" }}>
          {labels.workspaceQuestion}
        </Text>
        <Text type="secondary" style={{ display: "block" }}>
          {labels.workspaceDescription}
        </Text>
        <Text type="secondary" style={{ display: "block" }}>
          {labels.workspaceDefault}
        </Text>
      </div>

      <Form form={form} layout="vertical" onFinish={handleAdd}>
        <Row gutter={[12, 0]} align="middle">
          <Col flex="auto">
            <Form.Item
              name="name"
              style={{ margin: 0 }}
              rules={[
                { required: true, message: labels.workspaceNameRequired },
                {
                  validator: (_, value) => {
                    if (!value || !value.trim()) return Promise.resolve();
                    if (!NAME_REGEX.test(value)) {
                      return Promise.reject(
                        new Error(t("onboarding.common.nameFormat")),
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                placeholder={labels.workspacePlaceholder}
                style={{ borderRadius: 10, height: 40 }}
              />
            </Form.Item>
          </Col>
          <Col>
            <Button
              icon={<PlusOutlined />}
              type="primary"
              htmlType="submit"
              style={{ height: 40, borderRadius: 10, fontWeight: 600 }}
            >
              {labels.workspaceCrear}
            </Button>
          </Col>
        </Row>
      </Form>

      {/* Lista de workspaces agregados */}
      <div
        style={{
          minHeight: 80,
          padding: "12px 14px",
          borderRadius: 12,
          border: `1.5px dashed ${token.colorBorderSecondary}`,
          background: token.colorFillAlter,
        }}
      >
        {workspaces.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("onboarding.workspace.emptyDescription", {
                  workspace: labels.workspaceSingular,
                })}
              </Text>
            }
            style={{ margin: "8px 0" }}
          />
        ) : (
          <Flex vertical gap={8}>
            {workspaces.map((workspace) => (
              <div
                key={workspace.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${workspace.isDefault ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
                  background: workspace.isDefault ? token.colorPrimaryBg : token.colorBgContainer,
                  transition: "all 0.2s ease",
                }}
              >
                <Flex align="center" gap={10}>
                  <AppstoreOutlined
                    style={{
                      color: workspace.isDefault ? token.colorPrimary : token.colorTextSecondary,
                      fontSize: 16,
                    }}
                  />
                  <Text strong style={{ fontSize: 14 }}>
                    {workspace.name}
                  </Text>
                  {workspace.isDefault && (
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
                      workspace.isDefault
                        ? t("onboarding.workspace.starTooltipDefault", {
                            workspace: labels.workspaceSingular,
                          })
                        : t("onboarding.workspace.starTooltipSetDefault")
                    }
                  >
                    <Button
                      type="text"
                      size="small"
                      aria-label={t("onboarding.workspace.starAriaLabel", {
                        workspace: labels.workspaceSingular,
                        name: workspace.name,
                      })}
                      disabled={workspace.isDefault}
                      onClick={() => handleSetDefault(workspace.name)}
                      icon={
                        workspace.isDefault
                          ? <StarFilled style={{ color: token.colorWarning }} />
                          : <StarOutlined style={{ color: token.colorTextQuaternary }} />
                      }
                    />
                  </Tooltip>
                  <Tooltip
                    title={t("onboarding.workspace.deleteTooltip", {
                      workspace: labels.workspaceSingular,
                    })}
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      aria-label={t("onboarding.workspace.deleteAriaLabel", {
                        workspace: labels.workspaceSingular,
                        name: workspace.name,
                      })}
                      onClick={() => handleRemove(workspace.name)}
                      icon={<DeleteOutlined />}
                    />
                  </Tooltip>
                </Flex>
              </div>
            ))}
          </Flex>
        )}
      </div>

      <Text type="secondary" style={{ fontSize: 12, display: "block", textAlign: "center" }}>
        {labels.workspacesLowerCreateHint}
      </Text>

      <Row gutter={[16, 10]}>
        <Col xs={12}>
          <Button block type="default" onClick={handlePrev}>
            {t("onboarding.backButton")}
          </Button>
        </Col>
        <Col xs={12}>
          <Button type="primary" block onClick={handleSubmit}>
            {t("onboarding.nextButton")}
          </Button>
        </Col>
      </Row>
      {onFinishNow && (
        <Button
          type="text"
          block
          onClick={() => onFinishNow({ workspacesToAdd: collectWorkspaces() })}
        >
          {t("onboarding.finishNowButton")}
        </Button>
      )}
    </Space>
  );
}
