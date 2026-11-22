import DeleteOutlined from "@ant-design/icons/DeleteOutlined";
import EditOutlined from "@ant-design/icons/EditOutlined";
import PlusOutlined from "@ant-design/icons/PlusOutlined";
import TagOutlined from "@ant-design/icons/TagOutlined";
import {
  Button,
  Card,
  Flex,
  Form,
  Input,
  Popconfirm,
  Space,
  theme,
  Tooltip,
  Typography,
} from "antd";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAddCategory,
  useCategory,
  useDeleteCategory,
} from "@/apis/hooks/useCategory";
import type { Category } from "@/models/Category";
import { SettingCategoryMigrate } from "@/components/settings/SettingCategoryMigrate";
import { useCurrentUser } from "@/apis/hooks/useCurrentUser";
import { getEntityLabels } from "@/utils/entityLabels";
import { CategoryEditModal } from "@/components/settings/CategoryEditModal";
import { getIconComponent } from "@/utils/getIconComponent";
import { useUndoableDelete } from "@/utils/useUndoableDelete";
import PendingDeleteIndicator from "@/components/PendingDeleteIndicator";
import { SettingSection } from "@/components/settings/SettingSection";

const { Text } = Typography;

interface AddCategoryForm {
  description: string;
}

interface CategoryCardProps {
  category: Category;
  onDelete: (id: number) => void;
  onEdit: (category: Category) => void;
  isDeleting?: boolean;
  isPendingRemoval?: boolean;
  categoriasQuitar: string;
}

function CategoryCard({
  category,
  onDelete,
  onEdit,
  isDeleting,
  isPendingRemoval,
  categoriasQuitar,
}: CategoryCardProps) {
  const { token } = theme.useToken();
  const { t } = useTranslation();

  // Usar iconName e iconColor de la categoría, o defaults si no están definidos
  const iconElement = useMemo(() => {
    const IconComponent = getIconComponent(category.iconName ?? "TagOutlined");
    return React.createElement(IconComponent);
  }, [category.iconName]);

  // El color es dato de la categoría (la identifica en el resto de la app): se mantiene, sin gradiente ni glow.
  const iconColor = category.iconColor ?? token.colorPrimary;

  return (
    <Card
      styles={{ body: { padding: "12px 16px" } }}
      style={{
        position: "relative",
        borderRadius: token.borderRadiusLG,
        borderColor: token.colorBorderSecondary,
        background: token.colorFillAlter,
        overflow: "hidden",
        ...(isPendingRemoval
          ? { opacity: 0.45, filter: "grayscale(70%)", pointerEvents: "none" }
          : {}),
      }}
    >
      {isPendingRemoval && <PendingDeleteIndicator />}
      <Flex align="center" justify="space-between" gap={12}>
        <Flex align="center" gap={12} style={{ minWidth: 0 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: token.borderRadius,
              background: iconColor,
              color: "#fff",
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {iconElement}
          </div>
          <Text strong style={{ fontSize: 15 }}>
            {category.description}
          </Text>
        </Flex>
        <Space size={8}>
          <Tooltip title={t("settings.category.editTooltip")}>
            <Button
              type="text"
              size="large"
              shape="circle"
              aria-label={t("settings.category.editAriaLabel", { name: category.description })}
              onClick={() => onEdit(category)}
              icon={<EditOutlined />}
            />
          </Tooltip>
          <Tooltip
            title={
              !category.isDeletable
                ? t("settings.category.deleteTooltipDisabled")
                : t("settings.category.deleteTooltipEnabled")
            }
          >
            <Popconfirm
              title={t("settings.category.deleteConfirmTitle")}
              description={categoriasQuitar}
              onConfirm={() => onDelete(category.id)}
              okText={t("settings.category.deleteConfirmOk")}
              cancelText={t("settings.category.deleteConfirmCancel")}
              okButtonProps={{ danger: true }}
              disabled={!category.isDeletable}
            >
              <Button
                type="text"
                danger
                size="large"
                shape="circle"
                aria-label={t("settings.category.deleteAriaLabel", { name: category.description })}
                disabled={!category.isDeletable || isDeleting}
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      </Flex>
    </Card>
  );
}

export function SettingCategory() {
  // Las categorías se obtienen del workspace activo del usuario (DEFAULT_WORKSPACE)
  const { data: categories = [], isLoading } = useCategory();
  const addCategoryMutation = useAddCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const { requestDelete: requestDeleteCategory, isPending: isPendingCategoryRemoval } =
    useUndoableDelete<number>({
      getId: (id) => id,
      onDelete: (id) => deleteCategoryMutation.mutateAsync({ categoryId: id }),
    });
  const [form] = Form.useForm<AddCategoryForm>();
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const labels = getEntityLabels(currentUser?.userType ?? null, t);

  // Estado para el modal de edición
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // null = el usuario todavía no decidió: el form queda abierto solo si no hay categorías.
  const [showForm, setShowForm] = useState<boolean | null>(null);
  const formOpen = showForm ?? (!isLoading && categories.length === 0);

  const closeForm = () => {
    form.resetFields();
    setShowForm(false);
  };

  const onFinish = (values: AddCategoryForm) => {
    addCategoryMutation.mutate(
      { description: values.description },
      { onSuccess: closeForm },
    );
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCategory(null);
  };

  return (
    <>
      <SettingSection
        loading={isLoading}
        icon={<TagOutlined />}
        title={t("settings.category.title")}
        subtitle={labels.categoriasSubtitle}
        extra={
          !formOpen && (
            <Button icon={<PlusOutlined />} onClick={() => setShowForm(true)}>
              {t("settings.category.openAddButton")}
            </Button>
          )
        }
      >
        <Flex vertical gap={10}>
          {categories.map((category: Category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onDelete={(categoryId) => requestDeleteCategory(categoryId)}
              onEdit={handleEdit}
              isDeleting={deleteCategoryMutation.isPending}
              isPendingRemoval={isPendingCategoryRemoval(category.id)}
              categoriasQuitar={labels.categoriasQuitar}
            />
          ))}
        </Flex>

        {formOpen && (
          <Card
            size="small"
            style={{
              borderRadius: token.borderRadiusLG,
              background: token.colorFillAlter,
              marginTop: token.marginMD,
            }}
          >
            <Form form={form} layout="vertical" onFinish={onFinish}>
              <Form.Item
                name="description"
                label={t("settings.category.nameLabel")}
                rules={[
                  { required: true, message: t("settings.category.nameRequired") },
                ]}
              >
                <Input autoFocus placeholder={t("settings.category.namePlaceholder")} />
              </Form.Item>
              <Flex justify="flex-end" gap={8}>
                <Button onClick={closeForm}>{t("settings.category.cancelButton")}</Button>
                <Button
                  icon={<PlusOutlined />}
                  type="primary"
                  htmlType="submit"
                  loading={addCategoryMutation.isPending}
                >
                  {t("settings.category.addButton")}
                </Button>
              </Flex>
            </Form>
          </Card>
        )}
      </SettingSection>

      <SettingCategoryMigrate />

      {/* Modal de edición */}
      <CategoryEditModal
        category={editingCategory}
        open={isEditModalOpen}
        onClose={handleCloseEditModal}
      />
    </>
  );
}
