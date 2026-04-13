import { hashUtils } from '../src';

describe('Hash Object', () => {
  it('should return a consistent hash for the same object', () => {
    const object = { key: 'value', anotherKey: 42 };
    const hash1 = hashUtils.hashObject(object);
    const hash2 = hashUtils.hashObject(object);

    expect(hash1).toEqual(hash2);
    expect(hash1).toEqual(
      '0b247980dc2518ff3f5acff725198b3f2635eec379a5e2b2f7698578b3e04d17',
    );
  });

  it('should return different hashes for different objects', () => {
    const object1 = { key: 'value1' };
    const object2 = { key: 'value2' };

    const hash1 = hashUtils.hashObject(object1);
    const hash2 = hashUtils.hashObject(object2);

    expect(hash1).not.toEqual(hash2);
    expect(hash1).toEqual(
      'dfada72ccc2244e8c7aef8f0dbe7c026a6553bc5bda3f7654f3d0b94dd51a23b',
    );
    expect(hash2).toEqual(
      '711db6965d4867a7c0f6f20864ae49896b97ba3616a9aa53b536a773468f662e',
    );
  });

  it('should handle nested objects correctly', () => {
    const nestedObject = { key: { nestedKey: 'nestedValue' } };

    const hash = hashUtils.hashObject(nestedObject);

    expect(hash).toEqual(
      '4608c367a922c21ed6baac6ecc5fc4e68d435de7da77ed4a13383960387b773d',
    );
  });

  it('should allow custom replacers to modify the hash', () => {
    const object = { key: 'value', anotherKey: 42 };
    const replacer = (key: string, value: unknown): unknown =>
      key === 'key' ? 'modifiedValue' : value;

    const hashWithReplacer = hashUtils.hashObject(object, replacer);
    const hashWithoutReplacer = hashUtils.hashObject(object);

    expect(hashWithReplacer).not.toEqual(hashWithoutReplacer);
    expect(hashWithReplacer).toEqual(
      '9f1110cc33c1a0517b5f008d8a8a8fd6683798dbd660bb0e774759ea2b4d8ceb',
    );
    expect(hashWithoutReplacer).toEqual(
      '0b247980dc2518ff3f5acff725198b3f2635eec379a5e2b2f7698578b3e04d17',
    );
  });

  it('should handle empty objects', () => {
    const object = {};

    const hash = hashUtils.hashObject(object);

    expect(hash).toEqual(
      '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a',
    );
  });

  it('should handle edge case with undefined object', () => {
    const object = undefined as unknown as object;

    expect(() => hashUtils.hashObject(object)).toThrow();
  });
});

describe('Hash Deterministic Object', () => {
  it('should return a consistent hash for the same object', () => {
    const object = { key: 'value', anotherKey: 42 };
    const hash1 = hashUtils.hashDeterministicObject(object);
    const hash2 = hashUtils.hashDeterministicObject(object);

    expect(hash1).toEqual(hash2);
    expect(hash1).toEqual(
      'bcfbe7147cc6988bf4987c322ca615a900ed0bce28c358e8404c1b5c14ac389f',
    );
  });

  it('should return the same hash for objects with keys in different orders', () => {
    const object1 = { key: 'value', anotherKey: 42 };
    const object2 = { anotherKey: 42, key: 'value' };

    const hash1 = hashUtils.hashDeterministicObject(object1);
    const hash2 = hashUtils.hashDeterministicObject(object2);

    expect(hash1).toEqual(hash2);
    expect(hash1).toEqual(
      'bcfbe7147cc6988bf4987c322ca615a900ed0bce28c358e8404c1b5c14ac389f',
    );
  });

  it('should return different hashes for different objects', () => {
    const object1 = { key: 'value1' };
    const object2 = { key: 'value2' };

    const hash1 = hashUtils.hashDeterministicObject(object1);
    const hash2 = hashUtils.hashDeterministicObject(object2);

    expect(hash1).not.toEqual(hash2);
    expect(hash1).toEqual(
      'dfada72ccc2244e8c7aef8f0dbe7c026a6553bc5bda3f7654f3d0b94dd51a23b',
    );
    expect(hash2).toEqual(
      '711db6965d4867a7c0f6f20864ae49896b97ba3616a9aa53b536a773468f662e',
    );
  });

  it('should handle nested objects correctly and deterministically', () => {
    const nestedObject1 = { key: { b: 2, a: 1 } };
    const nestedObject2 = { key: { a: 1, b: 2 } };

    const hash1 = hashUtils.hashDeterministicObject(nestedObject1);
    const hash2 = hashUtils.hashDeterministicObject(nestedObject2);

    expect(hash1).toEqual(hash2);
    expect(hash1).toEqual(
      '44a71c92a8d07443b2539b0d82a137c3a620aa81be56de2f29a9e2fe45fefbc4',
    );
  });

  it('should handle empty objects', () => {
    const object = {};

    const hash = hashUtils.hashDeterministicObject(object);

    expect(hash).toEqual(
      '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a',
    );
  });

  it('should handle edge case with undefined object', () => {
    const object = undefined as unknown as object;

    expect(() => hashUtils.hashDeterministicObject(object)).toThrow();
  });
});
