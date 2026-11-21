import { useState } from "react";
import { Button } from "antd";
import PlusOutlined from "@ant-design/icons/PlusOutlined";
import { useTranslation } from "react-i18next";
import type { ServiceToAdd } from "@/apis/SubscriptionApi";
import { useCurrentUser } from "@/apis/hooks/useCurrentUser";
import { useIsReadOnly } from "@/apis/workspace/useIsReadOnly";
import ModalComponent from "@/components/modals/Modal";
import { ServiceCardForm } from "@/components/services/ServiceCardForm";
import { getServiceLabels } from "@/utils/serviceLabels";

interface AddServiceModalProps {
  onAddService: (service: ServiceToAdd) => Promise<void> | void;
  /** Replaces the default trigger button; receives the onClick that opens the modal. */
  trigger?: (onClick: () => void) => React.ReactNode;
}

export function AddServiceModal({ onAddService, trigger }: AddServiceModalProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const labels = getServiceLabels(currentUser?.userType ?? null, t);
  const isReadOnly = useIsReadOnly();

  if (isReadOnly) {
    return null;
  }

  const handleAdd = (service: ServiceToAdd) => {
    void onAddService(service);
    setOpen(false);
  };

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          {labels.agregar}
        </Button>
      )}
      <ModalComponent
        open={open}
        onClose={() => setOpen(false)}
        title={labels.nuevo}
        footer={null}
        width={480}
      >
        <ServiceCardForm variant="plain" handleAddService={handleAdd} />
      </ModalComponent>
    </>
  );
}
