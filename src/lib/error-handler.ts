export const handleError = (_error: unknown, _context?: string) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    // console.error(_context ? `[${_context}]` : '', _error);
  }
};

export const logInfo = (_message: string, _data?: unknown) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    // console.log(_message, _data);
  }
};
