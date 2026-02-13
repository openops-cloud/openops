import { authenticationApi } from '@/app/lib/authentication-api';
import { AuthenticationResponse } from '@openops/shared';
import { NavigateFunction } from 'react-router-dom';
import { LOGOUT_EVENT_KEY } from './navigation-constants';
import { navigationUtil } from './navigation-util';

const currentUserKey = 'currentUser';

export const authenticationSession = {
  saveResponse(response: AuthenticationResponse) {
    localStorage.setItem(
      currentUserKey,
      JSON.stringify({
        ...response,
        token: undefined,
        tablesRefreshToken: undefined,
      }),
    );

    window.dispatchEvent(new Event('storage'));
  },

  getProjectId(): string | null {
    return this.getCurrentUser()?.projectId ?? null;
  },

  getOrganizationId(): string | null {
    const user = this.getCurrentUser();
    if (!user) {
      return null;
    }

    return user.organizationId;
  },

  getUserProjectRole() {
    return this.getCurrentUser()?.projectRole ?? null;
  },

  getUserOrganizationRole() {
    return this.getCurrentUser()?.organizationRole ?? null;
  },

  isLoggedIn(): boolean {
    return !!this.getCurrentUser();
  },

  async logOut({
    userInitiated = false,
    navigate,
    federatedLoginUrl,
  }: {
    userInitiated: boolean;
    navigate?: NavigateFunction;
    federatedLoginUrl?: string;
  }) {
    await authenticationApi.signOut();
    localStorage.removeItem(currentUserKey);

    // we don't want to redirect to the same page after explicit logout
    if (userInitiated) {
      navigationUtil.clear();
      localStorage.setItem(LOGOUT_EVENT_KEY, Date.now().toString());
    }

    if (federatedLoginUrl) {
      // do not use saved path from navigationUtil as we will get validation error from Frontegg
      window.location.href = `${federatedLoginUrl}/oauth/logout?post_logout_redirect_uri=${window.location.origin}`;
      return;
    }

    if (
      window.location.pathname === '/sign-in' ||
      window.location.pathname === '/sign-up'
    ) {
      return;
    }

    if (navigate) {
      navigate('/sign-in');
    }
  },

  getCurrentUser(): AuthenticationResponse | null {
    const user = localStorage.getItem(currentUserKey);
    if (user) {
      try {
        return JSON.parse(user);
      } catch (e) {
        console.error(e);
        return null;
      }
    }
    return null;
  },
};
