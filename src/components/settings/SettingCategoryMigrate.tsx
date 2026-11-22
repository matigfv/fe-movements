import SwapRightOutlined from "@ant-design/icons/SwapRightOutlined";
import RetweetOutlined from "@ant-design/icons/RetweetOutlined";
import {
  Button,
  Col,
  Flex,
  Form,
  Popconfirm,
  Row,
  Select,
  theme,
  Typography,
  App,
} from "antd";
import { useKeycloak } from "@react-keycloak/web";
import { useTranslation } from "react-i18next";
import { useCategory, useMigrateCategory } from "@/apis/hooks/useCategory";
import { SettingSection } from "@/components/settings/SettingSection";

const { Text } = Typography;

interface MigrateCategoryForm {
  fromCategoryId: number;
  toCategoryId: number;
}

export function SettingCategoryMigrate() {
  const { t } = useTranslation();
  const { keycloak } = useKeycloak();
  const roles: string[] =
    (keycloak?.tokenParsed?.realm_access?.roles as string[]) ?? [];
  const isAdmin =
    roles.includes("ROLE_ADMIN") || roles.includes("ADMIN");

  // Las categorías se obtienen del workspace activo del usuario (DEFAULT_WORKSPACE)
  const { data: categories = [] } = useCategory();
  const migrateMutation = useMigrateCategory();
  const [form] = Form.useForm<MigrateCategoryForm>();
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const fromCategoryId = Form.useWatch("fromCategoryId", form);
  const toCategoryId = Form.useWatch("toCategoryId", form);

  if (!isAdmin) return null;

  const fromCategory = categories.find((c) => c.id === fromCategoryId);
  const toCategory = categories.find((c) => c.id === toCategoryId);

  const onConfirm = () => {
    form
      .validateFields()
      .then((values) => {
        migrateMutation.mutate(values, {
          onSuccess: () => {
            message.success(
              t("settings.categoryMigrate.successMessage", {
                from: fromCategory?.description,
                to: toCategory?.description,
              }),
            );
            form.resetFields();
          },
          onError: () => {
            message.error(t("settings.categoryMigrate.errorMessage"));
          },
        });
      })
      .catch(() => {});
  };

  const confirmTitle =
    fromCategory && toCategory
      ? t("settings.categoryMigrate.confirmTitleWithNames", {
          from: fromCategory.description,
          to: toCategory.description,
        })
      : t("settings.categoryMigrate.confirmTitleDefault");

  const confirmDescription = t("settings.categoryMigrate.confirmDescription");

  return (
    <SettingSection
      icon={<RetweetOutlined />}
      title={t("settings.categoryMigrate.title")}
      subtitle={t("settings.categoryMigrate.subtitle")}
      style={{
        borderStyle: "dashed",
        borderColor: token.colorWarningBorder,
        marginTop: token.marginLG,
      }}
    >
      <Form form={form} layout="vertical">
        <Row gutter={[12, 0]} align="middle">
          <Col xs={24} sm={10}>
            <Form.Item
              name="fromCategoryId"
              label={
                <Text style={{ fontSize: 13, fontWeight: 600 }}>
                  {t("settings.categoryMigrate.fromLabel")}
                </Text>
              }
              style={{ marginBottom: 0 }}
              rules={[
                { required: true, message: t("settings.categoryMigrate.fromRequired") },
              ]}
            >
              <Select
                placeholder={t("settings.categoryMigrate.fromPlaceholder")}
                style={{ width: "100%" }}
                options={categories
                  .filter((c) => c.id !== toCategoryId)
                  .map((c) => ({ value: c.id, label: c.description }))}
              />
            </Form.Item>
          </Col>

          <Col
            xs={24}
            sm={4}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              paddingTop: 22,
            }}
          >
            <SwapRightOutlined
              style={{ fontSize: 22, color: token.colorWarning }}
            />
          </Col>

          <Col xs={24} sm={10}>
            <Form.Item
              name="toCategoryId"
              label={
                <Text style={{ fontSize: 13, fontWeight: 600 }}>
                  {t("settings.categoryMigrate.toLabel")}
                </Text>
              }
              style={{ marginBottom: 0 }}
              rules={[
                { required: true, message: t("settings.categoryMigrate.toRequired") },
              ]}
            >
              <Select
                placeholder={t("settings.categoryMigrate.toPlaceholder")}
                style={{ width: "100%" }}
                options={categories
                  .filter((c) => c.id !== fromCategoryId)
                  .map((c) => ({ value: c.id, label: c.description }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Flex justify="flex-end" style={{ marginTop: 16 }}>
          <Popconfirm
            title={confirmTitle}
            description={confirmDescription}
            onConfirm={onConfirm}
            okText={t("settings.categoryMigrate.migrateButton")}
            cancelText={t("settings.categoryMigrate.cancelButton")}
            okButtonProps={{
              loading: migrateMutation.isPending,
            }}
            disabled={!fromCategoryId || !toCategoryId}
          >
            <Button
              type="primary"
              loading={migrateMutation.isPending}
              disabled={!fromCategoryId || !toCategoryId}
            >
              {t("settings.categoryMigrate.migrateButton")}
            </Button>
          </Popconfirm>
        </Flex>
      </Form>
    </SettingSection>
  );
}
