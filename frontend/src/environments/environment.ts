function serviceUrl(port: number, localUrl: string): string {
  if (typeof window === 'undefined') {
    return localUrl;
  }

  const current = new URL(window.location.origin);
  const match = current.hostname.match(/^(.+)-\d+\.(.+)$/);
  if (!match || !current.hostname.endsWith('.app.github.dev')) {
    return localUrl;
  }

  return `${current.protocol}//${match[1]}-${port}.${match[2]}`;
}

export const environment = {
  production: false,
  apiBaseUrl: `${serviceUrl(5000, 'http://localhost:5000')}/api`,
  keycloak: {
    url: serviceUrl(8080, 'http://localhost:8080'),
    realm: 'eventhub',
    clientId: 'eventhub-frontend'
  }
};
