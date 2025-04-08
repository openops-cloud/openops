import { Helmet } from 'react-helmet-async';
import { useCandu } from './use-candu';

const Candu = () => {
  const { isCanduEnabled, canduClientToken, canduUserId } = useCandu();
  if (!isCanduEnabled) {
    return null;
  }

  return (
    <Helmet>
      <script type="text/javascript">
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
            userId: "${canduUserId}",
            clientToken: "${canduClientToken}"
          });
        `}
      </script>
    </Helmet>
  );
};

Candu.displayName = 'Candu';
export { Candu };
