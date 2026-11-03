import { LucideProps } from 'lucide-react';

const AtlasCloudIcon = ({
  size = 16,
  color = 'currentColor',
  ...props
}: LucideProps) => {
  return (
    <svg
      fill={color}
      height={size}
      width={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Atlas Cloud</title>
      <path d="M2 19 8 7l4 7 3-5 7 10Z" />
    </svg>
  );
};

AtlasCloudIcon.displayName = 'AtlasCloudIcon';
export default AtlasCloudIcon;
