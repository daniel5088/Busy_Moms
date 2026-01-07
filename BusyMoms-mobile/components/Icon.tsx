import { LucideIcon } from 'lucide-react-native';

interface IconProps {
  icon: LucideIcon;
  color?: string;
  size?: number;
}

export function Icon({ icon: IconComponent, color = '#000000', size = 24 }: IconProps) {
  return <IconComponent width={size} height={size} stroke={color} />;
}
