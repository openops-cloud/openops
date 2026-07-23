type UserSelection = { value: string; displayText: string };

// Follow-up buttons are link buttons that open a browser form which owns the
// resume; Slack still posts an interaction payload for them, so the endpoint
// must not resume the flow. Messages sent by older block versions have no
// followUpActions metadata, which is treated as an empty list.
export function isFollowUpAction(
  userSelection: UserSelection | UserSelection[],
  followUpActions: unknown,
): boolean {
  if (Array.isArray(userSelection) || !Array.isArray(followUpActions)) {
    return false;
  }

  return followUpActions.includes(userSelection.value);
}
