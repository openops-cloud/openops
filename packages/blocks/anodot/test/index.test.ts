import { anodot } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(anodot.auth).toMatchObject({
      props: {
        authUrl: {
          required: true,
          type: 'SHORT_TEXT',
        },
        apiUrl: {
          required: true,
          type: 'SHORT_TEXT',
        },
        username: {
          required: true,
          type: 'SHORT_TEXT',
        },
        password: {
          required: true,
          type: 'SECRET_TEXT',
        },
      },
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(anodot.actions()).length).toBe(6);
    expect(anodot.actions()).toMatchObject({
      get_recommendations_predefined: {
        name: 'get_recommendations_predefined',
        requireAuth: true,
      },
      get_recommendations: {
        name: 'get_recommendations',
        requireAuth: true,
      },
      update_user_status: {
        name: 'update_user_status',
        requireAuth: true,
      },
      anodot_add_comment: {
        name: 'anodot_add_comment',
        requireAuth: true,
      },
      anodot_update_comment: {
        name: 'anodot_update_comment',
        requireAuth: true,
      },
      anodot_delete_comment: {
        name: 'anodot_delete_comment',
        requireAuth: true,
      },
    });
  });
});
