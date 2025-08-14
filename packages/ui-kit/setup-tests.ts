jest.mock('react-markdown', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(({ children }) => children),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));
