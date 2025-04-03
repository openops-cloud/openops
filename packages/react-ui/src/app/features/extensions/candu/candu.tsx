import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { userHooks } from '@/app/common/hooks/user-hooks';
import { authenticationSession } from '@/app/lib/authentication-session';
import { FlagId } from '@openops/shared';
import { Helmet } from 'react-helmet-async';

const Candu = () => {
  const userId = authenticationSession.getCurrentUser()?.id;
  const clientToken = flagsHooks.useFlag<string>(
    FlagId.CANDU_CLIENT_TOKEN,
  ).data;
  const { userMeta } = userHooks.useUserMeta();
  const enableCandu = clientToken && userId && userMeta?.trackEvents;

  if (!enableCandu) {
    return null;
  }

  return (
    <Helmet>
      <script type="text/javascript" async={true}>
        {`
          (function (d, params) {
            var script = d.createElement('script');
            script.setAttribute(
              'src',
              'https://cdn.candu.ai/sdk/latest/candu.umd.js?token=' + params.clientToken
            );
            script.async = true;
            script.onload = function () {
              window.Candu.init(params);
            };
            d.head.appendChild(script);
          })(document, {
            userId: "${userId}",
            clientToken: "${clientToken}"
          });
        `}
      </script>
    </Helmet>
  );
};

Candu.displayName = 'Candu';
export { Candu };
