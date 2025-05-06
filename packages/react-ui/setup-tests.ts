import { TextDecoder, TextEncoder } from 'util';
Object.assign(global, { TextDecoder, TextEncoder });

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(({ children }) => children),
}));

jest.mock('@/app/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));
