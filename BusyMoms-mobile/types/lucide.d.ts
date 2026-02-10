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
    style?: any;
  }

  export type LucideIcon = ComponentType<LucideProps>;

  // All icons used in the project
  export const ArrowLeft: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const Award: LucideIcon;
  export const Bell: LucideIcon;
  export const Calendar: LucideIcon;
  export const Check: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const Circle: LucideIcon;
  export const Clock: LucideIcon;
  export const Cloud: LucideIcon;
  export const CloudLightning: LucideIcon;
  export const CloudRain: LucideIcon;
  export const CloudSnow: LucideIcon;
  export const Edit2: LucideIcon;
  export const Filter: LucideIcon;
  export const Folder: LucideIcon;
  export const FolderOpen: LucideIcon;
  export const Heart: LucideIcon;
  export const Home: LucideIcon;
  export const LogOut: LucideIcon;
  export const Mail: LucideIcon;
  export const MapPin: LucideIcon;
  export const Menu: LucideIcon;
  export const MessageCircle: LucideIcon;
  export const Mic: LucideIcon;
  export const Plus: LucideIcon;
  export const RefreshCcw: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Search: LucideIcon;
  export const Send: LucideIcon;
  export const Settings: LucideIcon;
  export const ShoppingBag: LucideIcon;
  export const ShoppingCart: LucideIcon;
  export const Sparkles: LucideIcon;
  export const SparklesIcon: LucideIcon;
  export const Square: LucideIcon;
  export const Star: LucideIcon;
  export const Sun: LucideIcon;
  export const SunIcon: LucideIcon;
  export const Target: LucideIcon;
  export const Trash2: LucideIcon;
  export const User: LucideIcon;
  export const Users: LucideIcon;
  export const X: LucideIcon;
  export const ZapIcon: LucideIcon;

  // Phase 9 - Settings, Notifications, Cycle Tracker
  export const CheckCircle: LucideIcon;
  export const Droplet: LucideIcon;
  export const Moon: LucideIcon;
  export const Ruler: LucideIcon;
  export const Sync: LucideIcon;
  export const Volume2: LucideIcon;
  export const Activity: LucideIcon;

  // Phase 10 - Life Receipts, Gift Finder, Tutorials
  export const Type: LucideIcon;
  export const Camera: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const Loader2: LucideIcon;
  export const MicOff: LucideIcon;
}
