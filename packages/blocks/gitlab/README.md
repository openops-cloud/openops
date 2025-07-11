# GitLab Block

This block provides integration with GitLab API to manage repositories, files, and merge requests.

## Actions

### Get File Content
Retrieve file content from a GitLab repository.

### Create Merge Request
Create a new merge request with file changes.

### Custom API Call
Make custom API calls to GitLab API.

## Authentication

This block uses GitLab Personal Access Token authentication. You need to:

1. Go to your GitLab profile settings
2. Navigate to Access Tokens
3. Create a new token with appropriate scopes (api, read_repository, write_repository)
4. Use the token in the authentication field

## Configuration

- **GitLab URL**: You can specify a custom GitLab instance URL or leave empty for gitlab.com
- **Project**: Select from your available GitLab projects
- **Branch**: Select from available branches in the chosen project