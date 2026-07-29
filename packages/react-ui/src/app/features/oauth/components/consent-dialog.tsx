import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openops/components/ui';
import { t } from 'i18next';
import { OAuthConsentRequest } from '../lib/oauth-api';

type ConsentDialogProps = {
  request: OAuthConsentRequest;
  onApprove: () => void;
  onDeny: () => void;
  isDeciding: boolean;
};

/**
 * What the connection will be able to do, in the user's terms.
 *
 * Stated as the upper bound and not varied by resource. A connection to the MCP server
 * reaches the API by exchanging its token for an API one, and how much of the API the
 * MCP server exposes is a deployment setting this screen cannot see — so promising
 * anything narrower here would be a promise it cannot keep.
 */
const describeAccess = (): string[] => [
  t('View your workflows, runs, and connections'),
  t('Create and change workflows on your behalf'),
  t('Run workflows and retry runs'),
  // Said out loud because it is the widest thing being granted. The project below is
  // where the connection starts, not a fence around it: the application can move to
  // any project this user can reach, exactly as they could in the browser.
  t('Act in any project you have access to, not only the one below'),
];

const ConsentDialog = ({
  request,
  onApprove,
  onDeny,
  isDeciding,
}: ConsentDialogProps) => (
  <Dialog
    open
    // Dismissing denies rather than doing nothing: the application is waiting on its
    // redirect, and telling it no is better than leaving it to time out. `open` stays
    // true so the dialog does not vanish while that request is in flight.
    onOpenChange={(open) => {
      if (!open && !isDeciding) {
        onDeny();
      }
    }}
  >
    <DialogContent className="max-w-[480px]">
      <DialogHeader>
        <DialogTitle>{t('Authorize access')}</DialogTitle>
        <DialogDescription>
          <span className="font-medium text-primary">{request.clientName}</span>{' '}
          {t('is asking to access OpenOps as you.')}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        {request.projectName && (
          <div className="flex items-baseline justify-between gap-4 rounded-sm border px-3 py-2">
            <span className="text-sm text-muted-foreground">
              {t('Starting in')}
            </span>
            <span className="text-sm font-medium text-right break-all">
              {request.projectName}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">
            {t('It will be able to:')}
          </span>
          <ul className="flex flex-col gap-1 list-disc pl-5">
            {describeAccess().map((item) => (
              <li key={item} className="text-sm text-muted-foreground">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          {t(
            'Only continue if you started this from the application named above. You can disconnect it later from this page.',
          )}
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDeny} disabled={isDeciding}>
          {t('Cancel')}
        </Button>
        <Button onClick={onApprove} loading={isDeciding}>
          {t('Allow access')}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

ConsentDialog.displayName = 'ConsentDialog';
export { ConsentDialog };
