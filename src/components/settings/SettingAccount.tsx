import { useState } from "react";
import {
  Button,
  Collapse,
  Descriptions,
  Flex,
  Grid,
  Input,
  message,
  Modal,
  Typography,
} from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import DeleteOutlined from "@ant-design/icons/DeleteOutlined";
import UserOutlined from "@ant-design/icons/UserOutlined";
import { useTranslation } from "react-i18next";
import { SettingSection } from "@/components/settings/SettingSection";
import { deleteAllMovements } from "@/apis/movement/MovementApi";
import { useCurrentUser } from "@/apis/hooks/useCurrentUser";
import { useUserRoles } from "@/apis/hooks/useUserRoles";
import { RoleEnum } from "@/enums/RoleEnum";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const ROLE_ORDER = [RoleEnum.ADMIN, RoleEnum.FAMILY, RoleEnum.GUEST] as const;

export default function SettingAccount() {
  const { t } = useTranslation();
  const screens = useBreakpoint();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { hasRole, hasAnyRole } = useUserRoles();

  const [modalOpen, setModalOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const confirmWord = t("settings.account.deleteAllWord");
  const confirmed = typed.trim().toUpperCase() === confirmWord.toUpperCase();
  // Un invitado no debería poder borrar el historial financiero del grupo.
  const canDelete = hasAnyRole(RoleEnum.ADMIN, RoleEnum.FAMILY);

  const closeModal = () => {
    setModalOpen(false);
    setTyped("");
  };

  const deleteAllMovementsMutation = useMutation({
    mutationFn: () => deleteAllMovements(),
    onSuccess: () => {
      closeModal();
      void queryClient.invalidateQueries();
      void message.success(t("settings.account.deleteAllSuccess"));
    },
    onError: () => {
      void message.error(t("settings.account.deleteAllError"));
    },
  });

  const role = ROLE_ORDER.find((r) => hasRole(r));
  const na = t("settings.account.notAvailable");

  return (
    <Flex vertical gap={16}>
      <SettingSection
        icon={<UserOutlined />}
        title={t("settings.account.title")}
        subtitle={t("settings.account.summarySubtitle")}
      >
        <Descriptions column={screens.md ? 2 : 1} size="small" layout="vertical">
          <Descriptions.Item label={t("settings.account.nameLabel")}>
            {currentUser?.givenName || na}
          </Descriptions.Item>
          <Descriptions.Item label={t("settings.account.emailLabel")}>
            {currentUser?.email || na}
          </Descriptions.Item>
          <Descriptions.Item label={t("settings.account.roleLabel")}>
            {role ? t(`settings.account.role${role}`) : na}
          </Descriptions.Item>
          <Descriptions.Item label={t("settings.account.typeLabel")}>
            {currentUser?.userType ? t(`settings.account.type${currentUser.userType}`) : na}
          </Descriptions.Item>
        </Descriptions>
      </SettingSection>

      {canDelete && (
        <Collapse
          ghost
          items={[
            {
              key: "danger",
              label: (
                <div>
                  <Text strong type="danger">
                    {t("settings.account.dangerTitle")}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {t("settings.account.dangerDescription")}
                  </Text>
                </div>
              ),
              children: (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setModalOpen(true)}
                >
                  {t("settings.account.deleteAllButton")}
                </Button>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={modalOpen}
        centered
        title={t("settings.account.deleteAllModalTitle")}
        onCancel={closeModal}
        cancelText={t("settings.account.deleteAllConfirmCancel")}
        okText={t("settings.account.deleteAllOk")}
        okButtonProps={{ danger: true, disabled: !confirmed }}
        confirmLoading={deleteAllMovementsMutation.isPending}
        onOk={() => deleteAllMovementsMutation.mutate()}
        destroyOnHidden
      >
        <Flex vertical gap={12}>
          <Text>{t("settings.account.deleteAllModalBody")}</Text>
          <Text strong>{t("settings.account.deleteAllTypePrompt", { word: confirmWord })}</Text>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmWord}
            aria-label={t("settings.account.deleteAllTypePrompt", { word: confirmWord })}
            autoComplete="off"
          />
        </Flex>
      </Modal>
    </Flex>
  );
}
