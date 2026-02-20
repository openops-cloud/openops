export const OptionIcon = ({
  imageLogoUrl,
  displayName,
}: {
  imageLogoUrl?: string;
  displayName: string;
}) => {
  if (!imageLogoUrl) {
    return null;
  }
  return (
    <img
      src={imageLogoUrl}
      alt={displayName}
      className="w-6 h-6 object-contain"
    />
  );
};

OptionIcon.displayName = 'OptionIcon';
