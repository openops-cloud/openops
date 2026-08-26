import {
  AWS_ACCOUNT_ID_REGEX,
  accountIdFromRoleArn,
  buildRoleArn,
  parseAccountEntries,
  parseAccountIds,
} from '../aws-bulk-roles-utils';

const entry = (id: string, alias = '') => ({ id, alias });

describe('AWS_ACCOUNT_ID_REGEX', () => {
  it('accepts exactly 12 digits', () => {
    expect(AWS_ACCOUNT_ID_REGEX.test('123456789012')).toBe(true);
    expect(AWS_ACCOUNT_ID_REGEX.test('012345678901')).toBe(true);
  });

  it('rejects anything else', () => {
    [
      '12345678901',
      '1234567890123',
      '12345678901a',
      '',
      ' 123456789012',
    ].forEach((value) => expect(AWS_ACCOUNT_ID_REGEX.test(value)).toBe(false));
  });
});

describe('parseAccountEntries', () => {
  it('reads one id per line', () => {
    expect(parseAccountEntries('111122223333\n444455556666\n')).toEqual([
      entry('111122223333'),
      entry('444455556666'),
    ]);
  });

  it('reads "id alias", "id, alias" and tab-separated (spreadsheet) lines', () => {
    expect(
      parseAccountEntries(
        '111122223333 prod-eu\n444455556666, prod-us\n777788889999\tprod-ap',
      ),
    ).toEqual([
      entry('111122223333', 'prod-eu'),
      entry('444455556666', 'prod-us'),
      entry('777788889999', 'prod-ap'),
    ]);
  });

  it('keeps everything after the id as the alias, spaces included', () => {
    expect(parseAccountEntries('123456789012 Payments Prod EU 2')).toEqual([
      entry('123456789012', 'Payments Prod EU 2'),
    ]);
  });

  it('ignores blank lines and surrounding whitespace', () => {
    expect(parseAccountEntries('\n  111122223333  \n\n')).toEqual([
      entry('111122223333'),
    ]);
  });

  it('keeps non-id first tokens so they can be reported as invalid', () => {
    expect(parseAccountEntries('Account ID\n876867 test3')).toEqual([
      entry('Account', 'ID'),
      entry('876867', 'test3'),
    ]);
  });

  it('treats several ids on one line as one id with an alias (one entry per line)', () => {
    expect(parseAccountEntries('111122223333, 444455556666')).toEqual([
      entry('111122223333', '444455556666'),
    ]);
  });

  it('parses a mixed hand-written list', () => {
    const text = [
      '123456789012 test',
      '987654321456 test2',
      '876867 test3',
      '768987654872, test4',
      '123467658903',
    ].join('\n');

    expect(parseAccountEntries(text)).toEqual([
      entry('123456789012', 'test'),
      entry('987654321456', 'test2'),
      entry('876867', 'test3'),
      entry('768987654872', 'test4'),
      entry('123467658903'),
    ]);
  });
});

describe('parseAccountIds', () => {
  it('returns valid entries with aliases and empty skip lists for a clean paste', () => {
    expect(
      parseAccountIds('111122223333 prod\n444455556666', new Set()),
    ).toEqual({
      valid: [entry('111122223333', 'prod'), entry('444455556666')],
      invalid: [],
      duplicates: [],
      duplicateAliases: [],
    });
  });

  it('reports tokens that are not 12-digit account ids as invalid, once each', () => {
    const result = parseAccountIds(
      'bad\n98765432109\nbad\n111122223333',
      new Set(),
    );

    expect(result.valid).toEqual([entry('111122223333')]);
    expect(result.invalid).toEqual(['bad', '98765432109']);
  });

  it('reports ids repeated in the paste as duplicates and keeps the first', () => {
    const result = parseAccountIds(
      '111122223333 first\n111122223333 second',
      new Set(),
    );

    expect(result.valid).toEqual([entry('111122223333', 'first')]);
    expect(result.duplicates).toEqual(['111122223333']);
  });

  it('reports ids already present in existing roles as duplicates', () => {
    const result = parseAccountIds(
      '111122223333\n444455556666',
      new Set(['111122223333']),
    );

    expect(result.valid).toEqual([entry('444455556666')]);
    expect(result.duplicates).toEqual(['111122223333']);
  });

  it('reports aliases used twice or already taken by existing roles', () => {
    const result = parseAccountIds(
      [
        '111122223333 prod',
        '444455556666 prod',
        '777788889999 existing',
        '123412341234',
        '555566667777',
      ].join('\n'),
      new Set(),
      new Set(['existing']),
    );

    expect(result.valid.map((e) => e.id)).toEqual([
      '111122223333',
      '123412341234',
      '555566667777',
    ]);
    expect(result.duplicateAliases).toEqual(['prod', 'existing']);
  });

  it('returns empty lists for empty or whitespace-only input', () => {
    expect(parseAccountIds('  \n\n ', new Set())).toEqual({
      valid: [],
      invalid: [],
      duplicates: [],
      duplicateAliases: [],
    });
  });
});

describe('buildRoleArn', () => {
  it('builds an IAM role ARN from account id and role name', () => {
    expect(buildRoleArn('111122223333', 'OpenOpsRole')).toBe(
      'arn:aws:iam::111122223333:role/OpenOpsRole',
    );
  });

  it('keeps role paths intact', () => {
    expect(buildRoleArn('111122223333', 'finops/OpenOpsRole')).toBe(
      'arn:aws:iam::111122223333:role/finops/OpenOpsRole',
    );
  });
});

describe('accountIdFromRoleArn', () => {
  it('extracts the account id from a role ARN', () => {
    expect(
      accountIdFromRoleArn('arn:aws:iam::111122223333:role/OpenOpsRole'),
    ).toBe('111122223333');
  });

  it('supports role paths and other partitions', () => {
    expect(
      accountIdFromRoleArn('arn:aws-cn:iam::111122223333:role/a/b/Role'),
    ).toBe('111122223333');
    expect(
      accountIdFromRoleArn('arn:aws-us-gov:iam::111122223333:role/Role'),
    ).toBe('111122223333');
  });

  it('returns undefined for non-role ARNs and non-strings', () => {
    expect(
      accountIdFromRoleArn('arn:aws:iam::111122223333:user/bob'),
    ).toBeUndefined();
    expect(accountIdFromRoleArn('not-an-arn')).toBeUndefined();
    expect(accountIdFromRoleArn(null)).toBeUndefined();
    expect(accountIdFromRoleArn(undefined)).toBeUndefined();
  });
});
