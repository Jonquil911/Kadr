export function getProviderIds(user) {
  return (user?.providerData ?? []).map((p) => p.providerId);
}

export function hasPasswordProvider(user) {
  return getProviderIds(user).includes('password');
}