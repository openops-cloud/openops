import {
  accountIdFromRoleArn,
  AWS_ACCOUNT_ID_REGEX,
  buildRoleArn,
  parseAccountIds,
} from '../aws-bulk-roles-utils';

describe('AWS_ACCOUNT_ID_REGEX', () => {
  it.each([
    ['111122223333', true],
    ['11112222333', false],
    ['1111222233334', false],
    ['11112222333a', false],
    ['', false],
  ])('matches %s -> %s', (value, expected) => {
    expect(AWS_ACCOUNT_ID_REGEX.test(value)).toBe(expected);
  });
});

describe('parseAccountIds', () => {
  const noExisting = new Set<string>();

  it('splits on newlines', () => {
    const result = parseAccountIds(
      '111122223333\n444455556666\n777788889999',
      noExisting,
    );

    expect(result).toEqual({
      valid: ['111122223333', '444455556666', '777788889999'],
      invalid: [],
      duplicates: [],
    });
  });

  it('splits on commas, semicolons and spaces', () => {
    const result = parseAccountIds(
      '111122223333, 444455556666;777788889999 000011112222',
      noExisting,
    );

    expect(result.valid).toEqual([
      '111122223333',
      '444455556666',
      '777788889999',
      '000011112222',
    ]);
  });

  it('handles mixed separators and surrounding whitespace', () => {
    const result = parseAccountIds(
      '  111122223333,\n\t444455556666 ,, 777788889999\r\n',
      noExisting,
    );

    expect(result.valid).toEqual([
      '111122223333',
      '444455556666',
      '777788889999',
    ]);
    expect(result.invalid).toEqual([]);
  });

  it('reports tokens that are not 12-digit account ids as invalid', () => {
    const result = parseAccountIds(
      '111122223333 98765432109 abc 1111222233334',
      noExisting,
    );

    expect(result.valid).toEqual(['111122223333']);
    expect(result.invalid).toEqual(['98765432109', 'abc', '1111222233334']);
  });

  it('reports ids repeated within the paste as duplicates (kept once in valid)', () => {
    const result = parseAccountIds(
      '111122223333 444455556666 111122223333',
      noExisting,
    );

    expect(result.valid).toEqual(['111122223333', '444455556666']);
    expect(result.duplicates).toEqual(['111122223333']);
  });

  it('reports ids already present in existing roles as duplicates', () => {
    const result = parseAccountIds(
      '111122223333 444455556666',
      new Set(['444455556666']),
    );

    expect(result.valid).toEqual(['111122223333']);
    expect(result.duplicates).toEqual(['444455556666']);
  });

  it('lists each duplicate or invalid token only once', () => {
    const result = parseAccountIds(
      '111122223333 111122223333 111122223333 abc abc',
      new Set(['111122223333']),
    );

    expect(result.valid).toEqual([]);
    expect(result.duplicates).toEqual(['111122223333']);
    expect(result.invalid).toEqual(['abc']);
  });

  it('returns empty lists for empty or whitespace-only input', () => {
    expect(parseAccountIds('', noExisting)).toEqual({
      valid: [],
      invalid: [],
      duplicates: [],
    });
    expect(parseAccountIds(' \n , ', noExisting)).toEqual({
      valid: [],
      invalid: [],
      duplicates: [],
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

  it.each([
    'not-an-arn',
    'arn:aws:iam::11112222333:role/Short',
    'arn:aws:s3:::bucket',
    'arn:aws:iam::111122223333:user/Someone',
    '',
  ])('returns undefined for %s', (arn) => {
    expect(accountIdFromRoleArn(arn)).toBeUndefined();
  });

  it('returns undefined for non-string values', () => {
    expect(accountIdFromRoleArn(undefined)).toBeUndefined();
    expect(accountIdFromRoleArn(null)).toBeUndefined();
  });
});
