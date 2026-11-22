import MailOutlined from "@ant-design/icons/MailOutlined";
import { Badge, Space, theme } from "antd";
import { useTranslation } from "react-i18next";
import { useSentWorkspaceInvitations } from "@/apis/hooks/useWorkspaces";
import type { SentInvitation } from "@/models/UserWorkspace";
import { InvitationStatusEnum } from "@/enums/InvitationStatusEnum";
import { SettingSection } from "@/components/settings/SettingSection";
import SettingSentInvitationCard from "@/components/settings/SettingSentInvitationCard";

export function SettingSentInvitations() {
  const { data: invitations, isFetching } = useSentWorkspaceInvitations();
  const { token } = theme.useToken();
  const { t } = useTranslation();

  // Solo mostramos las pendientes: son las únicas que se pueden cancelar, y el historial de
  // aceptadas/rechazadas/canceladas no aporta nada útil en esta vista.
  const pendingSent = invitations?.filter(
    (invite) => invite.status === InvitationStatusEnum.PENDING,
  );

  if (!pendingSent || pendingSent.length === 0) {
    return null;
  }

  return (
    <div className="fade-in-down">
      <SettingSection
        loading={isFetching}
        icon={<MailOutlined />}
        title={
          <Space size={8}>
            {t("settings.sentInvitations.title")}
            <Badge count={pendingSent.length} style={{ backgroundColor: token.colorPrimary }} />
          </Space>
        }
      >
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          {pendingSent.map((invite: SentInvitation) => (
            <SettingSentInvitationCard key={invite.id} invite={invite} />
          ))}
        </Space>
      </SettingSection>
    </div>
  );
}
