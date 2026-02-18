import { LucideProps } from 'lucide-react';

const TogetherAiIcon = ({
  size = 16,
  color = 'currentColor',
  strokeWidth = 1,
  ...props
}: LucideProps) => {
  return (
    <svg
      fill={color}
      fillRule="evenodd"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>together.ai</title>
      <path
        d="M17.385 11.23a4.615 4.615 0 100-9.23 4.615 4.615 0 000 9.23zm0 10.77a4.615 4.615 0 100-9.23 4.615 4.615 0 000 9.23zm-10.77 0a4.615 4.615 0 100-9.23 4.615 4.615 0 000 9.23z"
        opacity=".2"
      ></path>
      <circle cx="6.615" cy="6.615" r="4.615"></circle>
    </svg>
  );
};

TogetherAiIcon.displayName = 'TogetherAiIcon';
export default TogetherAiIcon;
