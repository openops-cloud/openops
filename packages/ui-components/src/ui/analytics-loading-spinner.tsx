// Circumference of circle with r=20: 2π×20 ≈ 125.66
// Dash of 13 ≈ 37° — matches Superset's short blue arc with rounded caps
export const AnalyticsLoadingSpinner = () => {
  return (
    <svg
      className="w-12 h-12 animate-spin"
      viewBox="0 0 48 48"
      role="img"
      aria-label="Loading"
    >
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        className="stroke-gray-200"
        strokeWidth="5"
      />
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        className="stroke-blueAccent-500"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="13 113"
      />
    </svg>
  );
};

AnalyticsLoadingSpinner.displayName = 'AnalyticsLoadingSpinner';
