import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@openops/components/ui';
import { t } from 'i18next';
import { OAuthConsentRequest } from '../lib/oauth-api';

type ConsentCardProps = {
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
];

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4 rounded-sm border px-3 py-2">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-right break-all">{value}</span>
  </div>
);

const ConsentCard = ({
  request,
  onApprove,
  onDeny,
  isDeciding,
}: ConsentCardProps) => (
  <Card className="w-full max-w-[480px]">
    <CardHeader>
      <CardTitle className="text-xl">{t('Authorize access')}</CardTitle>
      <CardDescription>
        <span className="font-medium text-primary">{request.clientName}</span>{' '}
        {t('is asking to access OpenOps as you.')}
      </CardDescription>
    </CardHeader>

    <CardContent className="flex flex-col gap-4">
      {request.projectName && (
        <DetailRow label={t('Project')} value={request.projectName} />
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t('It will be able to:')}</span>
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
          'Only continue if you started this from the application named above. You can disconnect it later from your OpenOps settings.',
        )}
      </p>
    </CardContent>

    <CardFooter className="flex justify-end gap-2">
      <Button variant="outline" onClick={onDeny} disabled={isDeciding}>
        {t('Cancel')}
      </Button>
      <Button onClick={onApprove} loading={isDeciding}>
        {t('Allow access')}
      </Button>
    </CardFooter>
  </Card>
);

ConsentCard.displayName = 'ConsentCard';
export { ConsentCard };
