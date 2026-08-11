import {
  oauthProjectMembershipService,
  OAuthProjectMembershipService,
} from './project-membership';

export function getOAuthProjectMembershipService(): OAuthProjectMembershipService {
  return oauthProjectMembershipService;
}
