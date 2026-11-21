import { createFileRoute } from "@tanstack/react-router";
import { App, Button, Col, Row, Typography } from "antd";
import PlusOutlined from "@ant-design/icons/PlusOutlined";
import { useMemo } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { ServiceToAdd } from "@/apis/SubscriptionApi";
import { ServiceCard } from "@/components/services/ServiceCard";
import { AddServiceModal } from "@/components/services/AddServiceModal";
import ServicesEmptyState from "@/components/services/ServicesEmptyState";
import {
  useAddService,
  usePayService,
  useSubscription,
  useUpdateService,
} from "@/apis/hooks/useService";
import { useServiceSubscription } from "@/apis/websocket/useServiceSubscription";
import { ServiceSummary } from "@/components/services/ServiceSummary";
import { protectedRouteGuard } from "@/apis/auth/protectedRouteGuard";
import { RoleEnum } from "@/enums/RoleEnum";
import { useCurrentUser } from "@/apis/hooks/useCurrentUser";
import { getServiceLabels } from "@/utils/serviceLabels";

const visuallyHidden: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

export const Route = createFileRoute("/services")({
  beforeLoad: protectedRouteGuard({
    roles: [RoleEnum.ADMIN, RoleEnum.FAMILY, RoleEnum.GUEST],
  }),
  loader: ({ context: { queryClient } }) => {
    queryClient.invalidateQueries({ queryKey: ["service-history"] });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: services = [], isFetching } = useSubscription();
  const { message } = App.useApp();
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const labels = getServiceLabels(currentUser?.userType ?? null, t);

  useServiceSubscription();

  const payMutation = usePayService();
  const updateServiceMutation = useUpdateService({
    onSuccess: () => {
      void message.success(labels.updateSuccess);
    },
  });
  const addServiceMutation = useAddService({
    onSuccess: () => {
      void message.success(labels.addSuccess);
    },
  });

  // Owner tags only help when several people share the workspace.
  const showOwner = useMemo(
    () => new Set(services.map((s) => s.user)).size > 1,
    [services],
  );

  const handleAddService = (service: ServiceToAdd) => {
    addServiceMutation.mutate(service);
  };
  return (
    <div style={{ paddingTop: 30 }}>
      {/* Page heading for the card titles (h5) to hang from; visually hidden to keep the layout. */}
      <Typography.Title level={1} style={visuallyHidden}>
        {labels.plural}
      </Typography.Title>
      {(isFetching || services.length > 0) && (
        <div className="fade-in-up" style={{ animationDelay: "0ms" }}>
          <Row justify="end" style={{ marginBottom: 12 }}>
            <Col xs={24} sm={10} md={7} lg={5}>
            <AddServiceModal
              onAddService={handleAddService}
              trigger={(onClick) => (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={onClick}
                  block
                  style={{ minHeight: 44 }}
                >
                  {labels.agregar}
                </Button>
              )}
            />
            </Col>
          </Row>
          <ServiceSummary services={services} isFetching={isFetching} />
        </div>
      )}

      {!isFetching && services.length === 0 && (
        <div style={{ marginBottom: 16 }}>
          <ServicesEmptyState onAddService={handleAddService} />
        </div>
      )}

      {(isFetching || services.length > 0) && (
        <Row gutter={16} style={{ marginBottom: 16, padding: 0 }}>
          {services?.map((service, index) => (
            <Col
              xs={24}
              sm={12}
              lg={8}
              key={service.id}
              style={{ marginBottom: 16, animationDelay: `${(index + 1) * 80}ms` }}
              className="fade-in-up"
            >
              <ServiceCard
                service={service}
                showOwner={showOwner}
                handlePayServiceMutation={(s) => payMutation.mutateAsync(s)}
                handleUpdateServiceMutation={(s) => updateServiceMutation.mutate(s)}
              />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
