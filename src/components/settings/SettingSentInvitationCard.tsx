import Card from "antd/es/card/Card";
import type { SentInvitation } from "@/models/UserWorkspace";
import { App, Button, Flex, Popconfirm, theme, Typography } from "antd";
import DeleteOutlined from "@ant-design/icons/DeleteOutlined";
import MailOutlined from "@ant-design/icons/MailOutlined";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { cancelWorkspaceInvitationApi } from "@/apis/WorkspaceApi";
import { getWorkspaceDisplayName } from "@/utils/workspaceDisplay";

const { Text } = Typography;

interface SettingSentInvitationCardProps {
  invite: SentInvitation;
}

export default function SettingSentInvitationCard({
  invite,
}: SettingSentInvitationCardProps) {
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const cancelInvitationMutation = useMutation({
    mutationFn: () => cancelWorkspaceInvitationApi(invite.id),
    onSuccess: () => {
      void message.success(t("settings.sentInvitations.cancelSuccessMessage"));
      void queryClient.invalidateQueries({ queryKey: ["workspace-sent-invitations"] });
    },
    onError: () => {
      void message.error(t("settings.sentInvitations.cancelErrorMessage"));
    },
  });

  return (
    <Card
      styles={{ body: { padding: "14px 18px" } }}
      style={{
        borderRadius: token.borderRadiusLG,
        borderColor: token.colorBorderSecondary,
        background: token.colorBgContainer,
      }}
    >
      <Flex align="center" justify="space-between" gap={12} style={{ minWidth: 0 }}>
        <Flex align="center" gap={12} style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: token.borderRadius,
              flexShrink: 0,
              background: token.colorFillTertiary,
              color: token.colorTextSecondary,
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MailOutlined />
          </div>
          <Flex vertical gap={4} style={{ minWidth: 0, flex: 1 }}>
            <Text
              strong
              style={{
                fontSize: 15,
                color: token.colorText,
                letterSpacing: "-0.2px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",
              }}
            >
              {getWorkspaceDisplayName(invite.workspaceName, t)}
            </Text>
            <Flex align="center" gap={6} style={{ minWidth: 0 }}>
              <Text type="secondary" style={{ fontSize: 13, flexShrink: 0 }}>
                {t("settings.sentInvitations.invitedUserLabel")}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: token.colorPrimary,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {invite.invitedUserEmail}
              </Text>
            </Flex>
          </Flex>
        </Flex>

        <Popconfirm
          title={t("settings.sentInvitations.cancelConfirmTitle")}
          description={t("settings.sentInvitations.cancelConfirmDescription", {
            email: invite.invitedUserEmail,
          })}
          onConfirm={() => cancelInvitationMutation.mutate()}
          okText={t("settings.sentInvitations.cancelConfirmOk")}
          cancelText={t("settings.sentInvitations.cancelConfirmCancel")}
          okButtonProps={{ danger: true, loading: cancelInvitationMutation.isPending }}
          placement="topRight"
        >
          <Button
            danger
            icon={<DeleteOutlined />}
            loading={cancelInvitationMutation.isPending}
            style={{ fontWeight: 600, flexShrink: 0 }}
          >
            {t("settings.sentInvitations.cancelButton")}
          </Button>
        </Popconfirm>
      </Flex>
    </Card>
  );
}
