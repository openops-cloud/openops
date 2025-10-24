import {
  CalendarClock,
  CircleCheckBig,
  CircleX,
  Code,
  Database,
  File,
  Globe,
  Hourglass,
  List,
  Mail,
  Network,
  RotateCw,
  Superscript,
  TableProperties,
  Wand,
} from 'lucide-react';
import React from 'react';

export const ICON_MAPPING: Record<string, React.ElementType> = {
  Wand: Wand,
  RotateCw: RotateCw,
  Code: Code,
  Network: Network,
  CircleCheckBig: CircleCheckBig,
  CalendarClock: CalendarClock,
  File: File,
  Globe: Globe,
  List: List,
  Superscript: Superscript,
  Database: Database,
  TableProperties: TableProperties,
  Mail: Mail,
  Hourglass: Hourglass,
  CircleX: CircleX,
};

export const getIconComponent = (
  iconName?: string,
): React.ElementType | undefined => {
  if (!iconName) return undefined;
  return ICON_MAPPING[iconName];
};
