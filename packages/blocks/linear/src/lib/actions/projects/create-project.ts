import { LinearDocument } from '@linear/sdk';
import { createAction, Property } from '@openops/blocks-framework';
import { linearAuth } from '../../..';
import { makeClient } from '../../common/client';
import { props } from '../../common/props';

export const linearCreateProject = createAction({
  auth: linearAuth,
  name: 'linear_create_project',
  displayName: 'Create Project',
  description: 'Create a new project in Linear workspace',
  isWriteAction: true,
  props: {
    team_id: props.team_id(),
    name: Property.ShortText({
      displayName: 'Project Name',
      required: true,
    }),
    description: Property.LongText({
      displayName: 'Description',
      required: true,
    }),
    icon: Property.ShortText({
      displayName: 'Icon',
      required: false,
    }),
    color: Property.ShortText({
      displayName: 'Color (HEX)',
      required: true,
    }),
    startDate: Property.DateTime({
      displayName: 'Start Date',
      required: false,
    }),
    targetDate: Property.DateTime({
      displayName: 'Target Date',
      required: false,
    }),
  },
  async run({ auth, propsValue }) {
    const project: LinearDocument.ProjectCreateInput = {
      teamIds: [propsValue.team_id!],
      name: propsValue.name,
      description: propsValue.description,
      icon: propsValue.icon,
      color: propsValue.color,
      startDate: propsValue.startDate,
      targetDate: propsValue.targetDate,
    };

    const client = makeClient(auth);
    const result = await client.createProject(project);
    if (result.success) {
      const createdProject = await result.project;
      return {
        success: result.success,
        lastSyncId: result.lastSyncId,
        project: createdProject,
      };
    } else {
      throw new Error(`Unexpected error: ${JSON.stringify(result)}`);
    }
  },
});
