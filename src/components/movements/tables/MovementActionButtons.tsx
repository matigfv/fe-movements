import { App, Button, Popconfirm } from "antd";
import CopyOutlined from "@ant-design/icons/CopyOutlined";
import DeleteOutlined from "@ant-design/icons/DeleteOutlined";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { FormattedMovement } from "@/components/movements/tables/types";
import EditMovementModal from "@/components/modals/movements/EditMovementModal";
import { uploadExpense } from "@/apis/movement/MovementApi";
import { TypeEnum } from "@/enums/TypeEnum";

interface MovementActionButtonsProps {
  record: FormattedMovement;
  onDelete: (id: number) => void;
}

export default function MovementActionButtons({
  record,
  onDelete,
}: MovementActionButtonsProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

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

  return (
    <>
      {canRepeat && (
        <Button
          type="text"
          loading={repeatMutation.isPending}
          onClick={() => repeatMutation.mutate()}
          icon={<CopyOutlined style={{ fontSize: 20, cursor: "pointer", marginRight: 8 }} />}
          style={{ color: "gray", borderRadius: 8, padding: "4px 8px", fontSize: 18 }}
          title={t("movements.repeat.tooltip")}
          aria-label={t("movements.repeat.tooltip")}
        />
      )}
      <Popconfirm
        title={t("movements.deleteConfirmTitle")}
        onConfirm={() => onDelete(record.id)}
        okText={t("movements.yes")}
        cancelText={t("movements.no")}
        placement="topRight"
      >
        <Button
          type="text"
          icon={
            <DeleteOutlined
              style={{ fontSize: 20, cursor: "pointer", marginRight: 8 }}
            />
          }
          style={{
            color: "gray",
            borderRadius: 8,
            padding: "4px 8px",
            fontSize: 18,
          }}
          title={t("movements.deleteTooltip")}
          aria-label={t("movements.deleteTooltip")}
        />
      </Popconfirm>
      <EditMovementModal movement={record} />
    </>
  );
}
