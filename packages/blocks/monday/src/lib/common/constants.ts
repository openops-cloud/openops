export const enum MondayColumnType {
  AUTO_NUMBER = 'auto_number',
  BOARD_RELATION = 'board_relation',
  BUTTON = 'button',
  CHECKBOX = 'checkbox',
  COLOR_PICKER = 'color_picker',
  COUNTRY = 'country',
  CREATION_LOG = 'creation_log',
  DATE = 'date',
  DEPENDENCY = 'dependency',
  DOC = 'doc',
  DROPDOWN = 'dropdown',
  EMAIL = 'email',
  FILE = 'file',
  FORMULA = 'formula',
  HOUR = 'hour',
  ITEM_ASSIGNEES = 'item_assignees',
  ITEM_ID = 'item_id',
  LAST_UPDATED = 'last_updated',
  LINK = 'link',
  LOCATION = 'location',
  LONG_TEXT = 'long_text',
  MIRROR = 'mirror',
  NAME = 'name',
  NUMBERS = 'numbers',
  PHONE = 'phone',
  PEOPLE = 'people',
  PROGRESS = 'progress',
  RATING = 'rating',
  STATUS = 'status',
  SUBTASKS = 'subtasks',
  TAGS = 'tags',
  TEAM = 'team',
  TEXT = 'text',
  TIMELINE = 'timeline',
  TIME_TRACKING = 'time_tracking',
  VOTE = 'vote',
  WEEK = 'week',
  WORLD_CLOCK = 'world_clock',
  UNSUPPORTED = 'unsupported',
}

export const enum BoardType {
  BOARD = 'board',
  SUB_ITEMS_BOARD = 'sub_items_board',
}
export const MondayNotWritableColumnType = [
  MondayColumnType.UNSUPPORTED,
  MondayColumnType.AUTO_NUMBER,
  MondayColumnType.NAME,
  MondayColumnType.COLOR_PICKER,
  MondayColumnType.BUTTON,
  MondayColumnType.MIRROR,
  MondayColumnType.SUBTASKS,
  MondayColumnType.ITEM_ID,
  MondayColumnType.CREATION_LOG,
  MondayColumnType.FILE,
  MondayColumnType.FORMULA,
  MondayColumnType.DOC,
  MondayColumnType.LAST_UPDATED,
  MondayColumnType.PROGRESS,
  MondayColumnType.TAGS,
  MondayColumnType.TIME_TRACKING,
  MondayColumnType.VOTE,
];

export const COLUMN_TYPE_OPTIONS = [
  {
    label: 'Auto Number',
    value: MondayColumnType.AUTO_NUMBER,
  },
  {
    label: 'Color Picker',
    value: MondayColumnType.COLOR_PICKER,
  },
  {
    label: 'Checkbox',
    value: MondayColumnType.CHECKBOX,
  },
  {
    label: 'Country',
    value: MondayColumnType.COUNTRY,
  },
  {
    label: 'Creation Log',
    value: MondayColumnType.CREATION_LOG,
  },
  {
    label: 'Date',
    value: MondayColumnType.DATE,
  },
  {
    label: 'Dropdown',
    value: MondayColumnType.DROPDOWN,
  },
  {
    label: 'Email',
    value: MondayColumnType.EMAIL,
  },
  {
    label: 'Hour',
    value: MondayColumnType.HOUR,
  },
  {
    label: 'Item ID',
    value: MondayColumnType.ITEM_ID,
  },
  {
    label: 'Last Updated',
    value: MondayColumnType.LAST_UPDATED,
  },
  {
    label: 'Link',
    value: MondayColumnType.LINK,
  },
  {
    label: 'Location',
    value: MondayColumnType.LOCATION,
  },
  {
    label: 'Long Text',
    value: MondayColumnType.LONG_TEXT,
  },
  {
    label: 'Numbers',
    value: MondayColumnType.NUMBERS,
  },
  {
    label: 'People',
    value: MondayColumnType.PEOPLE,
  },
  {
    label: 'Phone',
    value: MondayColumnType.PHONE,
  },
  {
    label: 'Progress Tracking',
    value: MondayColumnType.PROGRESS,
  },
  {
    label: 'Rating',
    value: MondayColumnType.RATING,
  },
  {
    label: 'Status',
    value: MondayColumnType.STATUS,
  },
  {
    label: 'Tags',
    value: MondayColumnType.TAGS,
  },
  {
    label: 'Text',
    value: MondayColumnType.TEXT,
  },
  {
    label: 'Timeline',
    value: MondayColumnType.TIMELINE,
  },
  {
    label: 'Time Tracking',
    value: MondayColumnType.TIME_TRACKING,
  },
  {
    label: 'Vote',
    value: MondayColumnType.VOTE,
  },
  {
    label: 'Week',
    value: MondayColumnType.WEEK,
  },
  {
    label: 'World Clock',
    value: MondayColumnType.WORLD_CLOCK,
  },
];
