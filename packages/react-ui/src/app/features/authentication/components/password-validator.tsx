import { getPasswordRules } from '@openops/shared';
import { Check, X } from 'lucide-react';
import { useMemo } from 'react';

const PasswordValidator = ({ password }: { password: string }) => {
  const passwordRules = useMemo(() => getPasswordRules(), []);

  return (
    <>
      {passwordRules.map((rule, index) => {
        return (
          <div key={index} className="flex flex-row gap-2">
            {rule.condition(password) ? (
              <Check className="text-success" />
            ) : (
              <X className="text-destructive" />
            )}
            <span>{rule.label}</span>
          </div>
        );
      })}
    </>
  );
};
PasswordValidator.displayName = 'PasswordValidator';
export { PasswordValidator };
