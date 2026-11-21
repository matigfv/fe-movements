import { App, Button, Dropdown, theme } from "antd";
import type { MenuProps } from "antd";
import CopyOutlined from "@ant-design/icons/CopyOutlined";
import DeleteOutlined from "@ant-design/icons/DeleteOutlined";
import MoreOutlined from "@ant-design/icons/MoreOutlined";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { FormattedMovement } from "@/components/movements/tables/types";
import EditMovementModal from "@/components/modals/movements/EditMovementModal";
import { uploadExpense } from "@/apis/movement/MovementApi";
import { TypeEnum } from "@/enums/TypeEnum";

interface MovementActionButtonsProps {
  record: FormattedMovement;
  onDelete: (id: number) => void;
  /** Bigger "more actions" trigger (44px) for touch layouts. */
  touch?: boolean;
}

export default function MovementActionButtons({
  record,
  onDelete,
  touch = false,
}: MovementActionButtonsProps) {
  const { t } = useTranslation();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { token } = theme.useToken();

  // Un CREDITO arrastraría cuotaActual/cuotasTotales de la compra original, y el cron ya genera
  // las cuotas siguientes — por eso solo se repiten movimientos sin plan de cuotas.
  const canRepeat = record.type !== TypeEnum.CREDITO && record.currency != null;

  const repeatMutation = useMutation({
    mutationFn: () =>
      uploadExpense({
        bank: record.bank,
        description: record.description,
        date: new Date(),
        currency: record.currency?.symbol ?? "",
        amount: record.amount,
        type: record.type,
        categories: record.categories.map((c) => c.description),
        items: record.items.map(({ quantity, unit, description, price }) => ({
          quantity,
          unit,
          description,
          price,
        })),
      }),
    onSuccess: () => {
      void message.success(t("movements.repeat.success"));
      void queryClient.invalidateQueries({ queryKey: ["movement-history"] });
    },
    onError: () => void message.error(t("movements.repeat.error")),
  });

  // The delete is undoable (useUndoableDelete shows an "Undo" notification before the real DELETE).
  const confirmDelete = () =>
    modal.confirm({
      centered: true,
      title: t("movements.deleteConfirmTitle"),
      content: t("movements.deleteConfirmDescription"),
      okText: t("movements.deleteConfirmOk"),
      okButtonProps: { danger: true },
      cancelText: t("movements.cancel"),
      onOk: () => onDelete(record.id),
    });

  const items: MenuProps["items"] = [
    ...(canRepeat
      ? [
          {
            key: "repeat",
            icon: <CopyOutlined />,
            label: t("movements.repeat.label"),
            disabled: repeatMutation.isPending,
            onClick: () => repeatMutation.mutate(),
          },
        ]
      : []),
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: t("movements.deleteConfirmOk"),
      danger: true,
      onClick: confirmDelete,
    },
  ];

  const triggerSize = touch ? 44 : 32;

  return (
    <>
      <EditMovementModal movement={record} touch={touch} />
      <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
        <Button
          type="text"
          aria-label={t("movements.moreActions")}
          icon={<MoreOutlined style={{ fontSize: 20 }} />}
          loading={repeatMutation.isPending}
          style={{
            color: token.colorTextSecondary,
            width: triggerSize,
            height: triggerSize,
            marginLeft: touch ? 8 : 0,
          }}
        />
      </Dropdown>
    </>
  );
}
