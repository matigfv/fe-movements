import DeleteOutlined from "@ant-design/icons/DeleteOutlined";
import DollarOutlined from "@ant-design/icons/DollarOutlined";
import PlusOutlined from "@ant-design/icons/PlusOutlined";
import StarFilled from "@ant-design/icons/StarFilled";
import StarOutlined from "@ant-design/icons/StarOutlined";
import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Popconfirm,
  Row,
  Space,
  theme,
  Tooltip,
  Typography,
} from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAddCurrency,
  useCurrency,
  useDeleteCurrency,
} from "@/apis/hooks/useCurrency";
import { useUserDefault, useSetUserDefault } from "@/apis/hooks/useSettings";
import type { Currency } from "@/models/Currency";
import { useCurrentUser } from "@/apis/hooks/useCurrentUser";
import { getEntityLabels } from "@/utils/entityLabels";
import { useUndoableDelete } from "@/utils/useUndoableDelete";
import PendingDeleteIndicator from "@/components/PendingDeleteIndicator";
import { DefaultPill, SettingSection } from "@/components/settings/SettingSection";

const { Text } = Typography;

interface AddCurrencyForm {
  symbol: string;
  description: string;
}

interface CurrencyCardProps {
  currency: Currency;
  defaultCurrencyId?: number | null;
  onSetDefault: (id: number) => void;
  isSettingDefault?: boolean;
  onDelete: (id: number) => void;
  isDeleting?: boolean;
  isPendingRemoval?: boolean;
  monedasQuitar: string;
}

function CurrencyCard({
  currency,
  defaultCurrencyId,
  onSetDefault,
  isSettingDefault,
  onDelete,
  isDeleting,
  isPendingRemoval,
  monedasQuitar,
}: CurrencyCardProps) {
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const isDefault = currency.id === defaultCurrencyId;
  const canDelete = currency.isDeletable && !isDefault;

  return (
    <Card
      styles={{ body: { padding: "12px 16px" } }}
      style={{
        position: "relative",
        borderRadius: token.borderRadiusLG,
        borderColor: isDefault ? token.colorPrimaryBorder : token.colorBorderSecondary,
        background: isDefault ? token.colorPrimaryBg : token.colorFillAlter,
        overflow: "hidden",
        ...(isPendingRemoval
          ? { opacity: 0.45, filter: "grayscale(70%)", pointerEvents: "none" }
          : {}),
      }}
    >
      {isPendingRemoval && <PendingDeleteIndicator />}
      <Flex align="center" justify="space-between" gap={12}>
        <Flex align="center" gap={12} style={{ minWidth: 0 }}>
          <div
            style={{
              minWidth: 40,
              height: 40,
              borderRadius: token.borderRadius,
              background: token.colorFillTertiary,
              color: token.colorTextSecondary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              padding: "0 6px",
            }}
          >
            <Text strong style={{ fontSize: 14, color: "inherit" }}>
              {currency.symbol}
            </Text>
          </div>
          <Flex align="center" gap={8} wrap style={{ minWidth: 0 }}>
            <Text strong style={{ fontSize: 15 }}>
              {currency.description}
            </Text>
            {isDefault && (
              <DefaultPill>{t("settings.currency.defaultBadge")}</DefaultPill>
            )}
          </Flex>
        </Flex>
        <Space size={8}>
          <Tooltip
            title={
              isDefault
                ? t("settings.currency.starTooltipDefault")
                : t("settings.currency.starTooltipSetDefault")
            }
          >
            <Button
              type="text"
              size="large"
              shape="circle"
              aria-label={t("settings.currency.starAriaLabel", { name: currency.description })}
              disabled={isDefault || isSettingDefault}
              onClick={() => onSetDefault(currency.id)}
              icon={
                isDefault ? (
                  <StarFilled style={{ color: token.colorWarning }} />
                ) : (
                  <StarOutlined style={{ color: token.colorTextTertiary }} />
                )
              }
            />
          </Tooltip>
          <Tooltip
            title={
              isDefault
                ? t("settings.currency.deleteTooltipDefault")
                : !currency.isDeletable
                  ? t("settings.currency.deleteTooltipDisabled")
                  : t("settings.currency.deleteTooltipEnabled")
            }
          >
            <Popconfirm
              title={t("settings.currency.deleteConfirmTitle")}
              description={monedasQuitar}
              onConfirm={() => onDelete(currency.id)}
              okText={t("settings.currency.deleteConfirmOk")}
              cancelText={t("settings.currency.deleteConfirmCancel")}
              okButtonProps={{ danger: true }}
              disabled={!canDelete}
            >
              <Button
                type="text"
                danger
                size="large"
                shape="circle"
                aria-label={t("settings.currency.deleteAriaLabel", { name: currency.description })}
                disabled={!canDelete || isDeleting}
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      </Flex>
    </Card>
  );
}

export function SettingCurrency() {
  const { data: currencies = [], isLoading } = useCurrency();
  const { data: defaultCurrency } = useUserDefault("DEFAULT_CURRENCY");
  const setDefaultMutation = useSetUserDefault();
  const addCurrencyMutation = useAddCurrency();
  const deleteCurrencyMutation = useDeleteCurrency();
  const { requestDelete: requestDeleteCurrency, isPending: isPendingCurrencyRemoval } =
    useUndoableDelete<number>({
      getId: (id) => id,
      onDelete: (id) => deleteCurrencyMutation.mutateAsync(id),
    });
  const [form] = Form.useForm<AddCurrencyForm>();
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const labels = getEntityLabels(currentUser?.userType ?? null, t);

  // null = el usuario todavía no decidió: el form queda abierto solo si no hay monedas.
  const [showForm, setShowForm] = useState<boolean | null>(null);
  const isEmpty = !isLoading && currencies.length === 0;
  const formOpen = showForm ?? isEmpty;

  const closeForm = () => {
    form.resetFields();
    setShowForm(false);
  };

  const onFinish = (values: AddCurrencyForm) => {
    addCurrencyMutation.mutate(
      { symbol: values.symbol, description: values.description },
      { onSuccess: closeForm },
    );
  };

  return (
    <SettingSection
      loading={isLoading}
      icon={<DollarOutlined />}
      title={t("settings.currency.title")}
      subtitle={
        <>
          {labels.monedasSubtitle}
          <br />
          {t("settings.currency.defaultHint")}
        </>
      }
      extra={
        !formOpen && (
          <Button icon={<PlusOutlined />} onClick={() => setShowForm(true)}>
            {t("settings.currency.openAddButton")}
          </Button>
        )
      }
    >
      {isEmpty && (
        <Alert
          type="warning"
          showIcon
          title={t("settings.currency.requiredNoticeTitle")}
          description={t("settings.currency.requiredNoticeDescription")}
          style={{ marginBottom: token.marginMD }}
        />
      )}

      <Flex vertical gap={10}>
        {currencies.map((currency: Currency) => (
          <CurrencyCard
            key={currency.id}
            currency={currency}
            defaultCurrencyId={defaultCurrency?.value}
            onSetDefault={(id) =>
              setDefaultMutation.mutate({ key: "DEFAULT_CURRENCY", value: id })
            }
            isSettingDefault={setDefaultMutation.isPending}
            onDelete={(id) => requestDeleteCurrency(id)}
            isDeleting={deleteCurrencyMutation.isPending}
            isPendingRemoval={isPendingCurrencyRemoval(currency.id)}
            monedasQuitar={labels.monedasQuitar}
          />
        ))}
      </Flex>

      {formOpen && (
        <Card
          size="small"
          style={{
            borderRadius: token.borderRadiusLG,
            background: token.colorFillAlter,
            marginTop: token.marginMD,
          }}
        >
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Row gutter={[12, 0]}>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="symbol"
                  label={t("settings.currency.symbolLabel")}
                  rules={[
                    { required: true, message: t("settings.currency.symbolRequired") },
                  ]}
                >
                  <Input
                    autoFocus
                    placeholder={t("settings.currency.symbolPlaceholder")}
                    maxLength={10}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={16}>
                <Form.Item
                  name="description"
                  label={t("settings.currency.nameLabel")}
                  rules={[
                    { required: true, message: t("settings.currency.nameRequired") },
                  ]}
                >
                  <Input placeholder={t("settings.currency.namePlaceholder")} />
                </Form.Item>
              </Col>
            </Row>
            <Flex justify="flex-end" gap={8}>
              <Button onClick={closeForm}>{t("settings.currency.cancelButton")}</Button>
              <Button
                icon={<PlusOutlined />}
                type="primary"
                htmlType="submit"
                loading={addCurrencyMutation.isPending}
              >
                {t("settings.currency.addButton")}
              </Button>
            </Flex>
          </Form>
        </Card>
      )}
    </SettingSection>
  );
}
