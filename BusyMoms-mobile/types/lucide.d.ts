declare module 'lucide-react-native' {
  import { ComponentType } from 'react';

  export interface LucideProps {
    size?: number;
    color?: string;
    stroke?: string;
    fill?: string;
    strokeWidth?: number;
    width?: number;
    height?: number;
    absoluteStrokeWidth?: boolean;
  }

  export type LucideIcon = ComponentType<LucideProps>;

  export const Calendar: LucideIcon;
  export const Home: LucideIcon;
  export const ShoppingBag: LucideIcon;
  export const ShoppingCart: LucideIcon;
  export const Users: LucideIcon;
  export const User: LucideIcon;
  export const Menu: LucideIcon;
  export const Plus: LucideIcon;
  export const Trash2: LucideIcon;
  export const Check: LucideIcon;
  export const Clock: LucideIcon;
  export const MapPin: LucideIcon;
  export const Heart: LucideIcon;
  export const Settings: LucideIcon;
  export const LogOut: LucideIcon;
  export const ChevronRight: LucideIcon;
}
