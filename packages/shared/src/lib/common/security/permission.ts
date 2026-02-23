export enum Permission {
  // Connections
  READ_APP_CONNECTION = 'app_connection:read',
  WRITE_APP_CONNECTION = 'app_connection:write',
  DELETE_APP_CONNECTION = 'app_connection:delete',

  // Flows
  READ_FLOW = 'flow:read',
  WRITE_FLOW = 'flow:write',
  DELETE_FLOW = 'flow:delete',
  TEST_STEP_FLOW = 'flow:test_step',
  TEST_RUN_FLOW = 'flow:test_run',
  // this is publish / activate / deactivate
  UPDATE_FLOW_STATUS = 'flow:update_status',

  // Runs
  READ_RUN = 'flow_run:read',
  RETRY_RUN = 'flow_run:retry',

  // Folders
  READ_FOLDER = 'folder:read',
  WRITE_FOLDER = 'folder:write',
  DELETE_FOLDER = 'folder:delete',

  // Users
  WRITE_USER = 'user:write',

  // Tables
  WRITE_TABLE = 'table:write',
}
