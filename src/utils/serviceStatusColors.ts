import type { GlobalToken } from "antd";

export interface ServiceStatusStyles {
  /** Card surface: always neutral, status never tints it. */
  cardBg: string;
  cardBorder: string;
  /** Status label ("Pendiente" / "Pagado"). */
  labelColor: string;
  /** Amount: carries the to-do signal when pending, calm when paid. */
  amountColor: string;
}

/**
 * Pending = amber text (same family as the summary banner), paid = quiet green.
 * Red is reserved for failures and is never used for a service status.
 *
 * shortcut: antd colorWarningText/colorSuccessText are the base hues (2.1:1 and
 * 2.4:1 on white), so text uses palette shade 8 (orange8/green8, >=5.4:1 on the
 * card surface in both algorithms); revisit if the theme seed changes.
 */
export function getServiceStatusStyles(
  token: GlobalToken,
  isPaid: boolean,
): ServiceStatusStyles {
  return {
    cardBg: token.colorBgContainer,
    cardBorder: token.colorBorderSecondary,
    labelColor: isPaid ? token.green8 : token.orange8,
    amountColor: isPaid ? token.colorTextSecondary : token.orange8,
  };
}
