const LABEL_WIDTH = 116;
const LABEL_HEIGHT = 16;
const LABEL_PADDING = 6;

export function BranchLabelNode({ data }: { data: { label: string } }) {
  return (
    <svg
      width={LABEL_WIDTH + LABEL_PADDING * 2}
      height={LABEL_HEIGHT + LABEL_PADDING * 2}
    >
      <rect
        x={0}
        y={0}
        width={LABEL_WIDTH + LABEL_PADDING * 2}
        height={LABEL_HEIGHT + LABEL_PADDING * 2}
        fill="#6B7280"
        stroke="#fff"
        strokeWidth={2}
        rx={4}
      />
      <text
        x={(LABEL_WIDTH + LABEL_PADDING * 2) / 2}
        y={(LABEL_HEIGHT + LABEL_PADDING * 2) / 2}
        textAnchor="middle"
        alignmentBaseline="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize="14"
        fontWeight="400"
        style={{
          pointerEvents: 'none',
        }}
      >
        {data.label}
      </text>
    </svg>
  );
}
