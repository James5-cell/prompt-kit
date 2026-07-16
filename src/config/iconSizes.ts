/**
 * Icon size token system for Prompt Kit.
 *
 * Usage: import { ICON_SIZE } from '../config/iconSizes';
 *        <SomeIcon size={ICON_SIZE.md} />
 */
export const ICON_SIZE = {
  /** 12px — Decorative / chevron / arrow icons */
  xs:  12,
  /** 14px — Inline button icons (e.g. LogOut, Plus) */
  sm:  14,
  /** 16px — Nav item icons (sidebar main + sub, unified) */
  md:  16,
  /** 20px — Card header / section title icons */
  lg:  20,
  /** 24px — Large category display icons */
  xl:  24,
  /** 32px — Hero / empty-state icons */
  xxl: 32,
} as const;

export type IconSizeKey = keyof typeof ICON_SIZE;
