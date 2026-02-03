import { LucideProps } from 'lucide-react';

const AnthropicIcon = ({
  size = 16,
  color = 'currentColor',
  ...props
}: LucideProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.218 2.34668H11.62L16 13.3333H13.598L9.218 2.34668ZM4.37933 2.34668H6.89067L11.2707 13.3333H8.82133L7.926 11.026H3.34467L2.44867 13.3327H0L4.38 2.34801L4.37933 2.34668ZM7.134 8.98601L5.63533 5.12468L4.13667 8.98668H7.13333L7.134 8.98601Z"
        fill={color}
      />
    </svg>
  );
};

AnthropicIcon.displayName = 'AnthropicIcon';
export default AnthropicIcon;
