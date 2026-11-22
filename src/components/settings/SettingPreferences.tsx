import DollarOutlined from "@ant-design/icons/DollarOutlined";
import { Flex, Switch, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useUserDefault, useSetUserDefault } from "@/apis/hooks/useSettings";
import { SettingSection } from "@/components/settings/SettingSection";

const { Text } = Typography;

export function SettingPreferences() {
  const { data: autoIncomeSetting, isLoading } =
    useUserDefault("AUTO_INCOME_ENABLED");
  const setDefault = useSetUserDefault();
  const { t } = useTranslation();

  const isAutoIncomeEnabled = autoIncomeSetting?.value === 1;

  const handleAutoIncomeChange = (checked: boolean) => {
    setDefault.mutate({ key: "AUTO_INCOME_ENABLED", value: checked ? 1 : 0 });
  };

  return (
    <SettingSection
      loading={isLoading}
      icon={<DollarOutlined />}
      title={t("settings.preferences.title")}
      subtitle={t("settings.preferences.subtitle")}
    >
      {/* Ingresos automáticos */}
      <Flex align="center" justify="space-between" gap={16}>
        <Flex vertical gap={2}>
          <Text strong style={{ fontSize: 14 }}>
            {t("settings.preferences.autoIncomeLabel")}
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {t("settings.preferences.autoIncomeDescription")}
          </Text>
        </Flex>
        <Switch
          checked={isAutoIncomeEnabled}
          loading={setDefault.isPending}
          onChange={handleAutoIncomeChange}
        />
      </Flex>
    </SettingSection>
  );
}
