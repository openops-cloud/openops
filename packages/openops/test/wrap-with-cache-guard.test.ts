// import { wrapWithCacheGuard } from '../src/lib/wrap-with-cache-guard';
//
// jest.mock('@openops/server-shared', () => ({
//   cacheWrapper: {
//     getSerializedObject: jest.fn(),
//     setSerializedObject: jest.fn(),
//   },
// }));
//
// describe('Wrap with cache guard', () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//   });
//
//   test('should return empty obj when there are no ARNs', async () => {
//     const results = await Promise.all(
//       Array.from({ length: 2 }, () =>
//         wrapWithCacheGuard('cacheKey', getFields, 'tableId'),
//       ),
//     );
//
//     expect(results[0]).toBe('table name 1');
//   });
// });
//
