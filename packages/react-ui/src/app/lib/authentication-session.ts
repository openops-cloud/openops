import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

import { authenticationApi } from '@/app/lib/authentication-api';
import { AuthenticationResponse, isNil } from '@openops/shared';
import { NavigateFunction } from 'react-router-dom';
import { navigationUtil } from './navigation-util';
import { projectAuth } from './project-auth';

const tokenKey = 'token';
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

  getToken(): string | null {
    return Cookies.get(tokenKey) ?? null;
  },

  getProjectId(): string | null {
    const token = this.getToken();
    if (isNil(token)) {
      return null;
    }
    const decodedJwt = jwtDecode<{ projectId: string }>(token);
    return decodedJwt.projectId;
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

  // TODO: We don't have a way to switch between projects yet
  async switchToSession(projectId: string) {
    const result = await projectAuth.getTokenForProject(projectId);

    const decodedJwt = jwtDecode<{ exp: number }>(result.token);
    const expiration = new Date(decodedJwt.exp * 1000);

    Cookies.set(tokenKey, result.token, {
      secure: true,
      sameSite: 'strict',
      expires: expiration,
      signed: true,
      httpOnly: false,
      path: '/',
    });
  },

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  },

  async logOut({
    userInitiated = false,
    navigate,
  }: {
    userInitiated: boolean;
    navigate?: NavigateFunction;
  }) {
    await authenticationApi.signOut();
    localStorage.removeItem(currentUserKey);

    // we don't want to redirect to the same page after explicit logout
    if (userInitiated) {
      navigationUtil.clear();
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
