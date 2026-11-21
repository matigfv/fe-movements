import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Dropdown,
  Flex,
  Form,
  Input,
  InputNumber,
  Row,
  Tag,
  theme,
  Typography,
} from "antd";
import CheckCircleOutlined from "@ant-design/icons/CheckCircleOutlined";
import ClockCircleOutlined from "@ant-design/icons/ClockCircleOutlined";
import ApartmentOutlined from "@ant-design/icons/ApartmentOutlined";
import EditOutlined from "@ant-design/icons/EditOutlined";
import CloseOutlined from "@ant-design/icons/CloseOutlined";
import CheckOutlined from "@ant-design/icons/CheckOutlined";
import DeleteOutlined from "@ant-design/icons/DeleteOutlined";
import MoreOutlined from "@ant-design/icons/MoreOutlined";
import type { MenuProps } from "antd";
import type { Service, ServiceToUpdate } from "@/models/Service";
import React, { useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { useDeleteService } from "@/apis/hooks/useService";
import { useCurrentUser } from "@/apis/hooks/useCurrentUser";
import { formatAmount } from "@/utils/formatAmount";
import { getServiceLabels } from "@/utils/serviceLabels";
import { getServiceStatusStyles } from "@/utils/serviceStatusColors";
import { useUndoableDelete } from "@/utils/useUndoableDelete";
import { useUndoablePay } from "@/utils/useUndoablePay";
import PendingDeleteIndicator from "@/components/PendingDeleteIndicator";

const { Text, Title } = Typography;

interface ServiceCardProps extends React.HTMLAttributes<HTMLElement> {
  service: Service;
  handlePayServiceMutation: (service: Service) => Promise<void> | void;
  handleUpdateServiceMutation: (
    serviceToUpdate: ServiceToUpdate,
  ) => Promise<void> | void;
  /** Show the owner tag (only useful when the workspace has several owners). */
  showOwner?: boolean;
  /** Overrides the undo window for "mark as paid" (tests). */
  undoPayDelayMs?: number;
}

interface ServiceFormUpdate {
  amount: number;
  lastPayment: dayjs.Dayjs | null;
  description: string;
}

export const ServiceCard = React.memo(function ServiceCard({
  service,
  handlePayServiceMutation,
  handleUpdateServiceMutation,
  showOwner = false,
  undoPayDelayMs,
}: ServiceCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm<ServiceFormUpdate>();
  const { token } = theme.useToken();
  const { message, modal } = App.useApp();

  const { data: currentUser } = useCurrentUser();
  const { t } = useTranslation();
  const labels = getServiceLabels(currentUser?.userType ?? null, t);

  const { requestPay, isOptimisticallyPaid } = useUndoablePay<Service>({
    getId: (s) => s.id,
    onPay: (s) => handlePayServiceMutation(s),
    getMessage: () => t("services.card.undoPaidMessage", { description: service.description }),
    delayMs: undoPayDelayMs,
  });
  const isPaid = service.isPaid || isOptimisticallyPaid(service);
  const status = getServiceStatusStyles(token, isPaid);

  const handleSaveAmount = () => {
    form
      .validateFields()
      .then((values) => {
        if (values.amount <= 0) {
          void message.warning(t("services.card.amountMustBePositive"));
          return;
        }
        handleUpdateServiceMutation({
          id: service.id,
          changes: {
            amount: values.amount,
            description: values.description,
            lastPayment: values.lastPayment
              ? dayjs(values.lastPayment).toDate()
              : null,
          },
        });
        setIsEditing(false);
      })
      .catch(() => {});
  };

  const handlePay = () => {
    setIsEditing(false);
    requestPay(service);
  };

  const handleCancelEdit = () => {
    form.resetFields();
    setIsEditing(false);
  };

  const deleteServiceMutation = useDeleteService();
  const { requestDelete: requestDeleteService, isPending: isPendingServiceRemoval } =
    useUndoableDelete<Service>({
      getId: (s) => s.id,
      onDelete: (s) => deleteServiceMutation.mutateAsync(s),
      getMessage: () => t("services.card.undoDeletedMessage", { description: service.description }),
    });
  const isPendingRemoval = isPendingServiceRemoval(service);
  const lastPayment = service.lastPayment ? dayjs(service.lastPayment) : null;

  // The delete is undoable (useUndoableDelete shows an "Undo" notification before the real DELETE).
  const confirmDelete = () =>
    modal.confirm({
      centered: true,
      title: labels.eliminar,
      content: t("services.card.deleteConfirmDescription"),
      okText: t("services.card.deleteAction"),
      okButtonProps: { danger: true },
      cancelText: t("services.card.cancelButton"),
      onOk: () => requestDeleteService(service),
    });

  const menuItems: MenuProps["items"] = [
    {
      key: "edit",
      icon: <EditOutlined />,
      label: t("services.card.editAction"),
      onClick: () => setIsEditing(true),
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: t("services.card.deleteAction"),
      danger: true,
      onClick: confirmDelete,
    },
  ];

  return (
    <Card
      style={{
        position: "relative",
        borderRadius: token.borderRadiusLG,
        borderColor: status.cardBorder,
        background: status.cardBg,
        ...(isPendingRemoval
          ? { opacity: 0.45, filter: "grayscale(70%)", pointerEvents: "none" }
          : {}),
      }}
      styles={{ body: { padding: 16 } }}
    >
      {isPendingRemoval && <PendingDeleteIndicator />}
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          description: service.description,
          amount: service.amount,
          lastPayment: service.lastPayment
            ? dayjs(service.lastPayment)
            : dayjs(),
        }}
      >
        <div key={isEditing ? "edit" : "view"} className="fade-in">
        {/* Header */}
        <Flex align="center" justify="space-between" gap={8}>
          <Flex align="center" gap={10} style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: token.borderRadius,
                background: token.colorFillTertiary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ApartmentOutlined
                style={{ color: token.colorTextSecondary, fontSize: 18 }}
              />
            </div>
            {isEditing ? (
              <Form.Item
                name="description"
                style={{ margin: 0, flex: 1 }}
                rules={[
                  {
                    required: true,
                    message: t("services.card.descriptionRequired"),
                  },
                ]}
              >
                <Input />
              </Form.Item>
            ) : (
              <Title
                level={5}
                style={{
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {service.description}
              </Title>
            )}
          </Flex>
          <Text
            data-testid="service-status"
            strong
            style={{ color: status.labelColor, flexShrink: 0 }}
          >
            {isPaid ? <CheckCircleOutlined /> : <ClockCircleOutlined />}{" "}
            {isPaid ? t("services.card.statusPaid") : t("services.card.statusPending")}
          </Text>
        </Flex>

        <Divider style={{ margin: "12px 0" }} />

        {/* Monto */}
        <Flex align="center" justify="space-between" gap={8}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
              {t("services.card.amountLabel")}
            </Text>
            {isEditing ? (
              <Form.Item
                name="amount"
                style={{ margin: 0 }}
                rules={[
                  { required: true, message: t("services.card.amountRequired") },
                ]}
              >
                <InputNumber
                  min={0}
                  precision={2}
                  controls={false}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            ) : (
              <Title
                level={3}
                data-testid="service-amount"
                style={{ margin: 0, color: status.amountColor }}
              >
                {formatAmount(service.amount, null, 2, 2)}{" "}
                <Text style={{ fontSize: 14, color: token.colorTextSecondary }}>
                  {service.currency?.symbol}
                </Text>
              </Title>
            )}
          </div>

          {!isEditing && (
            <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
              <Button
                type="text"
                aria-label={t("services.card.moreActions")}
                icon={<MoreOutlined style={{ fontSize: 20 }} />}
                style={{ width: 44, height: 44, color: token.colorTextSecondary }}
              />
            </Dropdown>
          )}
        </Flex>

        {showOwner && (
          <Flex gap={6} wrap="wrap" style={{ marginTop: 8 }}>
            <Tag>{service.user}</Tag>
          </Flex>
        )}

        {/* Último pago */}
        <div style={{ marginTop: 8 }}>
          {isEditing ? (
            <Form.Item
              name="lastPayment"
              label={t("services.card.lastPaymentLabel")}
              style={{ marginBottom: 8 }}
            >
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          ) : (
            <Text style={{ fontSize: 13 }}>
              <Text strong>
                {t(isPaid ? "services.card.paidOnPrefix" : "services.card.lastPaymentPrefix")}{" "}
              </Text>
              <Text type="secondary">
                {lastPayment?.isValid() ? lastPayment.format("DD/MM/YYYY") : "—"}
              </Text>
            </Text>
          )}
        </div>

        {/* Footer buttons */}
        {isEditing && (
          <>
            <Divider style={{ margin: "12px 0" }} />
            <Row gutter={[8, 8]}>
              <Col xs={24} sm={12}>
                <Button
                  block
                  icon={<CheckOutlined />}
                  color="blue"
                  variant="outlined"
                  onClick={handleSaveAmount}
                >
                  {t("services.card.saveButton")}
                </Button>
              </Col>
              <Col xs={24} sm={12}>
                <Button
                  block
                  icon={<CloseOutlined />}
                  onClick={handleCancelEdit}
                >
                  {t("services.card.cancelButton")}
                </Button>
              </Col>
            </Row>
          </>
        )}
        {!isPaid && !isEditing && (
          <>
            <Divider style={{ margin: "12px 0" }} />
            {/* Default outline: neutral text keeps >=4.5:1 (white on the default primary is ~4:1) and avoids a second hue next to the amber status. */}
            <Button
              block
              icon={<CheckCircleOutlined />}
              onClick={handlePay}
            >
              {t("services.card.markAsPaidButton")}
            </Button>
          </>
        )}
        </div>
      </Form>
    </Card>
  );
});
