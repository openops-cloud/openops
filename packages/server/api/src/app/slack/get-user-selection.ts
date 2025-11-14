export function getUserSelection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any[],
):
  | { value: string; displayText: string }
  | { value: string; displayText: string }[]
  | undefined {
  if (!payload || !Array.isArray(payload) || payload.length === 0) {
    return undefined;
  }

  const action = payload[0];
  switch (action.type) {
    case 'button':
      return {
        value: action.value || action.text?.text,
        displayText: action.text?.text,
      };
    case 'timepicker':
      return {
        value: action.selected_time,
        displayText: action.selected_time,
      };
    case 'datepicker':
      return {
        value: action.selected_date,
        displayText: action.selected_date,
      };
    case 'static_select':
      return {
        value: action.selected_option?.value,
        displayText: action.selected_option?.text?.text,
      };
    case 'multi_static_select':
      return action.selected_options.map(
        (opt: { text: { text: string }; value: string }) => ({
          value: opt.value,
          displayText: opt.text?.text,
        }),
      );
    case 'radio_buttons':
      return {
        value: action.selected_option?.value,
        displayText: action.selected_option?.text?.text,
      };
    case 'conversations_select':
      return {
        value: action.selected_conversation,
        displayText: action.selected_conversation,
      };
    case 'channels_select':
      return {
        value: action.selected_channel,
        displayText: action.selected_channel,
      };
    case 'users_select':
      return {
        value: action.selected_user,
        displayText: action.selected_user,
      };
    default:
      return undefined;
  }
}
