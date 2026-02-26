const AUTH_UNAUTHORIZED_EVENT = 'phast:unauthorized';

export const emitUnauthorized = () => {
  window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
};

export const onUnauthorized = (handler) => {
  window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handler);
  return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handler);
};
