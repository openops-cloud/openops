import { gitlab } from '../src/index';

describe('GitLab Block', () => {
  it('should be defined', () => {
    expect(gitlab).toBeDefined();
  });

  it('should have correct display name', () => {
    expect(gitlab.displayName).toBe('GitLab');
  });

  it('should have correct logo URL', () => {
    expect(gitlab.logoUrl).toBe('https://static.openops.com/blocks/gitlab.png');
  });

  it('should have auth configured', () => {
    expect(gitlab.auth).toBeDefined();
  });

  it('should have actions', () => {
    expect(gitlab.actions).toBeDefined();
    expect(gitlab.actions.length).toBeGreaterThan(0);
  });

  it('should include get file action', () => {
    const getFileAction = gitlab.actions.find(action => action.name === 'get_file_action');
    expect(getFileAction).toBeDefined();
    expect(getFileAction?.displayName).toBe('Get file content');
  });

  it('should include create merge request action', () => {
    const createMRAction = gitlab.actions.find(action => action.name === 'create_merge_request_action');
    expect(createMRAction).toBeDefined();
    expect(createMRAction?.displayName).toBe('Create merge request');
  });
});