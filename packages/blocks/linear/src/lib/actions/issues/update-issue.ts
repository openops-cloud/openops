import { LinearDocument } from '@linear/sdk';
import { createAction, Property } from '@openops/blocks-framework';
import { linearAuth } from '../../..';
import { makeClient } from '../../common/client';
import { props } from '../../common/props';

export const linearUpdateIssue = createAction({
  auth: linearAuth,
  name: 'linear_update_issue',
  displayName: 'Update Issue',
  description: 'Update a issue in Linear Workspace',
  IsWriteAction: true,
  props: {
    team_id: props.team_id(),
    issue_id: props.issue_id(),
    title: Property.ShortText({
      displayName: 'Title',
      required: true,
    }),
    description: Property.LongText({
      displayName: 'Description',
      required: false,
    }),
    state_id: props.status_id(true),
    labels: props.labels(true),
    assignee_id: props.assignee_id(),
    priority_id: props.priority_id(true),
  },
  async run({ auth, propsValue }) {
    const issueId = propsValue.issue_id!;
    const issue: LinearDocument.IssueUpdateInput = {
      title: propsValue.title,
      description: propsValue.description,
      assigneeId: propsValue.assignee_id,
      stateId: propsValue.state_id,
      priority: propsValue.priority_id,
      labelIds: propsValue.labels,
    };
    const client = makeClient(auth);
    const result = await client.updateIssue(issueId, issue);
    if (result.success) {
      const updatedIssue = await result.issue;
      return {
        success: result.success,
        lastSyncId: result.lastSyncId,
        issue: updatedIssue,
      };
    } else {
      throw new Error(`Unexpected error: ${result}`);
    }
  },
});
