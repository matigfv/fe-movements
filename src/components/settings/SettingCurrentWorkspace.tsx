import { Avatar, Card, Empty, Flex, Space, Tag, theme, Tooltip, Typography } from "antd";
import TeamOutlined from "@ant-design/icons/TeamOutlined";
import UserOutlined from "@ant-design/icons/UserOutlined";
import MailOutlined from "@ant-design/icons/MailOutlined";
import { useTranslation } from "react-i18next";
import { useCurrentWorkspace } from "@/apis/workspace/WorkspaceContext";
import { useWorkspacesSubscription } from "@/apis/websocket/useWorkspacesSubscription";
import InviteUserToWorkspace from "@/components/modals/workspaces/InviteUserToWorkspace";
import ExitWorkspaceModal from "@/components/modals/workspaces/ExitWorkspaceModal";
import RemoveMemberButton from "@/components/modals/workspaces/RemoveMemberButton";
import { useCurrentUser } from "@/apis/hooks/useCurrentUser";
import { useUserRoles } from "@/apis/hooks/useUserRoles";
import { RoleEnum } from "@/enums/RoleEnum";
import { getEntityLabels } from "@/utils/entityLabels";
import { SettingSection } from "@/components/settings/SettingSection";
import {
  getWorkspaceDisplayName,
  getWorkspaceOwnerEmail,
  isForeignPersonalWorkspace,
} from "@/utils/workspaceDisplay";

const { Text } = Typography;

export function SettingCurrentWorkspace() {
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const { currentWorkspace, workspaces, isLoading } = useCurrentWorkspace();
  // Los miembros vienen incluidos en el workspace activo (metadata.memberDetails)
  const memberDetails = currentWorkspace?.metadata.memberDetails ?? [];
  const { data: currentUser } = useCurrentUser();
  const { hasAnyRole } = useUserRoles();
  const labels = getEntityLabels(currentUser?.userType ?? null, t);

  // Solo el OWNER del workspace o un administrador global pueden eliminar miembros — mismo
  // criterio que ya valida el backend (WorkspaceMembershipService.removeMembership).
  const canRemoveMembers =
    currentWorkspace?.metadata.role === "OWNER" || hasAnyRole(RoleEnum.ADMIN);

  const isForeignPersonal = currentWorkspace ? isForeignPersonalWorkspace(currentWorkspace) : false;
  const ownerEmail = isForeignPersonal && currentWorkspace ? getWorkspaceOwnerEmail(currentWorkspace) : undefined;

  useWorkspacesSubscription();

  // Solo mostrar botón de salir si hay más de un workspace
  const canLeave = workspaces.length > 1;

  if (!currentWorkspace) {
    return (
      <Card loading={isLoading} style={{ borderRadius: token.borderRadiusLG }}>
        <Empty description={t("settings.currentWorkspace.noWorkspaceSelected")} />
      </Card>
    );
  }

  return (
    <SettingSection
      loading={isLoading}
      icon={<TeamOutlined />}
      title={
        <Space size={8} wrap>
          {getWorkspaceDisplayName(currentWorkspace.workspaceName, t)}
          {isForeignPersonal && ownerEmail && (
            <Tooltip title={t("common.workspace.notYoursTooltip", { email: ownerEmail })}>
              <Tag color="gold" style={{ marginInlineEnd: 0, fontSize: 12 }}>
                {t("common.workspace.notYoursTag")}
              </Tag>
            </Tooltip>
          )}
          <span
            style={{
              background: token.colorFillSecondary,
              borderRadius: token.borderRadiusSM,
              color: token.colorTextSecondary,
              fontSize: 12,
              fontWeight: 400,
              padding: "2px 8px",
            }}
          >
            {t("settings.currentWorkspace.memberCount", {
              count: currentWorkspace.metadata.memberDetails.length,
            })}
          </span>
        </Space>
      }
      subtitle={labels.workspaceGestionar}
      extra={canLeave && <ExitWorkspaceModal group={currentWorkspace} />}
    >
      {/* Lista de miembros con botón invitar */}
      <div>
        <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
          <Flex align="center" gap={8}>
            <UserOutlined style={{ color: token.colorTextSecondary }} />
            <Text strong style={{ fontSize: 14 }}>
              {labels.miembros}
            </Text>
          </Flex>
          <InviteUserToWorkspace group={currentWorkspace} />
        </Flex>
        {memberDetails.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={labels.workspaceNoMiembros}
          />
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {memberDetails.map((member, index) => (
              <li
                key={member.userId}
                style={{
                  padding: "8px 0",
                  borderBottom:
                    index < memberDetails.length - 1
                      ? `1px solid ${token.colorBorderSecondary}`
                      : undefined,
                }}
              >
                <Flex align="center" justify="space-between" style={{ width: "100%" }}>
                  <Flex align="center" gap={12}>
                    <Avatar
                      size={32}
                      icon={<UserOutlined />}
                      style={{ backgroundColor: token.colorPrimaryBg, color: token.colorPrimary }}
                    />
                    <Flex align="center" gap={6}>
                      <MailOutlined style={{ color: token.colorTextSecondary, fontSize: 12 }} />
                      <Text style={{ fontSize: 13 }}>{member.email}</Text>
                    </Flex>
                  </Flex>
                  {canRemoveMembers && member.email !== currentUser?.email && (
                    <RemoveMemberButton
                      workspaceId={currentWorkspace.workspaceId}
                      userId={member.userId}
                      email={member.email}
                    />
                  )}
                </Flex>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SettingSection>
  );
}
