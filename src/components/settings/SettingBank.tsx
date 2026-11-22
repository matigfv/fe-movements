import BankOutlined from "@ant-design/icons/BankOutlined";
import DeleteOutlined from "@ant-design/icons/DeleteOutlined";
import PlusOutlined from "@ant-design/icons/PlusOutlined";
import StarFilled from "@ant-design/icons/StarFilled";
import StarOutlined from "@ant-design/icons/StarOutlined";
import {
  Alert,
  Button,
  Card,
  Flex,
  Form,
  Input,
  Popconfirm,
  Space,
  theme,
  Tooltip,
  Typography,
} from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAddBank, useBanks, useDeleteBank } from "@/apis/hooks/useBank";
import { useUserDefault, useSetUserDefault } from "@/apis/hooks/useSettings";
import type { BankRecord } from "@/models/Bank";
import { useCurrentUser } from "@/apis/hooks/useCurrentUser";
import { getEntityLabels } from "@/utils/entityLabels";
import { useUndoableDelete } from "@/utils/useUndoableDelete";
import PendingDeleteIndicator from "@/components/PendingDeleteIndicator";
import { DefaultPill, SettingSection } from "@/components/settings/SettingSection";

const { Text } = Typography;

interface AddBankForm {
  description: string;
}

interface BankCardProps {
  bank: BankRecord;
  defaultBankId?: number | null;
  onSetDefault: (id: number) => void;
  isSettingDefault?: boolean;
  onDelete: (id: number) => void;
  isDeleting?: boolean;
  isPendingRemoval?: boolean;
  bancosQuitar: string;
}

function BankCard({
  bank,
  defaultBankId,
  onSetDefault,
  isSettingDefault,
  onDelete,
  isDeleting,
  isPendingRemoval,
  bancosQuitar,
}: BankCardProps) {
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const isDefault = bank.id === defaultBankId;

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
              width: 40,
              height: 40,
              borderRadius: token.borderRadius,
              background: token.colorFillTertiary,
              color: token.colorTextSecondary,
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BankOutlined />
          </div>
          <Flex align="center" gap={8} wrap style={{ minWidth: 0 }}>
            <Text strong style={{ fontSize: 15 }}>
              {bank.description}
            </Text>
            {isDefault && <DefaultPill>{t("settings.bank.defaultBadge")}</DefaultPill>}
          </Flex>
        </Flex>
        <Space size={8}>
          <Tooltip
            title={
              isDefault
                ? t("settings.bank.starTooltipDefault")
                : t("settings.bank.starTooltipSetDefault")
            }
          >
            <Button
              type="text"
              size="large"
              shape="circle"
              aria-label={t("settings.bank.starAriaLabel", { name: bank.description })}
              disabled={isDefault || isSettingDefault}
              onClick={() => onSetDefault(bank.id)}
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
                ? t("settings.bank.deleteTooltipDefault")
                : t("settings.bank.deleteTooltipDelete")
            }
          >
            <Popconfirm
              title={t("settings.bank.deleteConfirmTitle")}
              description={bancosQuitar}
              onConfirm={() => onDelete(bank.id)}
              okText={t("settings.bank.deleteConfirmOk")}
              cancelText={t("settings.bank.deleteConfirmCancel")}
              okButtonProps={{ danger: true }}
              disabled={isDefault}
            >
              <Button
                type="text"
                danger
                size="large"
                shape="circle"
                aria-label={t("settings.bank.deleteAriaLabel", { name: bank.description })}
                disabled={isDefault || isDeleting}
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      </Flex>
    </Card>
  );
}

export function SettingBank() {
  const { data: banks = [], isLoading } = useBanks();
  const { data: defaultBank } = useUserDefault("DEFAULT_BANK");
  const setDefaultMutation = useSetUserDefault();
  const addBankMutation = useAddBank();
  const deleteBankMutation = useDeleteBank();
  const { requestDelete: requestDeleteBank, isPending: isPendingBankRemoval } =
    useUndoableDelete<number>({
      getId: (id) => id,
      onDelete: (id) => deleteBankMutation.mutateAsync(id),
    });
  const [form] = Form.useForm<AddBankForm>();
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const labels = getEntityLabels(currentUser?.userType ?? null, t);

  // null = el usuario todavía no decidió: el form queda abierto solo si no hay bancos.
  const [showForm, setShowForm] = useState<boolean | null>(null);
  const isEmpty = !isLoading && banks.length === 0;
  const formOpen = showForm ?? isEmpty;

  const closeForm = () => {
    form.resetFields();
    setShowForm(false);
  };

  const onFinish = (values: AddBankForm) => {
    addBankMutation.mutate(values.description, { onSuccess: closeForm });
  };

  return (
    <SettingSection
      loading={isLoading}
      icon={<BankOutlined />}
      title={t("settings.bank.title")}
      subtitle={
        <>
          {labels.bancosSubtitle}
          <br />
          {t("settings.bank.defaultHint")}
        </>
      }
      extra={
        !formOpen && (
          <Button icon={<PlusOutlined />} onClick={() => setShowForm(true)}>
            {t("settings.bank.openAddButton")}
          </Button>
        )
      }
    >
      {isEmpty && (
        <Alert
          type="warning"
          showIcon
          title={t("settings.bank.requiredNoticeTitle")}
          description={t("settings.bank.requiredNoticeDescription")}
          style={{ marginBottom: token.marginMD }}
        />
      )}

      <Flex vertical gap={10}>
        {banks.map((bank: BankRecord) => (
          <BankCard
            key={bank.id}
            bank={bank}
            defaultBankId={defaultBank?.value}
            onSetDefault={(id) =>
              setDefaultMutation.mutate({ key: "DEFAULT_BANK", value: id })
            }
            isSettingDefault={setDefaultMutation.isPending}
            onDelete={(id) => requestDeleteBank(id)}
            isDeleting={deleteBankMutation.isPending}
            isPendingRemoval={isPendingBankRemoval(bank.id)}
            bancosQuitar={labels.bancosQuitar}
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
            <Form.Item
              name="description"
              label={t("settings.bank.nameLabel")}
              rules={[{ required: true, message: t("settings.bank.nameRequired") }]}
            >
              <Input autoFocus placeholder={t("settings.bank.namePlaceholder")} />
            </Form.Item>
            <Flex justify="flex-end" gap={8}>
              <Button onClick={closeForm}>{t("settings.bank.cancelButton")}</Button>
              <Button
                icon={<PlusOutlined />}
                type="primary"
                htmlType="submit"
                loading={addBankMutation.isPending}
              >
                {t("settings.bank.addButton")}
              </Button>
            </Flex>
          </Form>
        </Card>
      )}
    </SettingSection>
  );
}
