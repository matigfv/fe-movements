import MailOutlined from "@ant-design/icons/MailOutlined";
import { Badge, Space, theme } from "antd";
import { useTranslation } from "react-i18next";
import { useWorkspaceInvitations } from "@/apis/hooks/useWorkspaces";
import type { Invitations } from "@/models/UserWorkspace";
import { SettingSection } from "@/components/settings/SettingSection";
import SettingInviteWorkspaceCard from "@/components/settings/SettingInviteWorkspaceCard";
import { useInvitationSubscription } from "@/apis/websocket/useInvitationSubscription";

export function SettingInviteWorkspaces() {
  const { data: invitations, isFetching } = useWorkspaceInvitations();
  const { token } = theme.useToken();
  const { t } = useTranslation();

  useInvitationSubscription();

  if (!invitations || invitations.length === 0) {
    return null;
  }

  return (
    <div className="fade-in-down">
      <SettingSection
        loading={isFetching}
        icon={<MailOutlined />}
        title={
          <Space size={8}>
            {t("settings.inviteWorkspace.pendingInvitationsTitle")}
            <Badge count={invitations.length} style={{ backgroundColor: token.colorPrimary }} />
          </Space>
        }
      >
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          {invitations.map((invite: Invitations) => (
            <SettingInviteWorkspaceCard key={invite.id} invite={invite} />
          ))}
        </Space>
      </SettingSection>
    </div>
  );
}
