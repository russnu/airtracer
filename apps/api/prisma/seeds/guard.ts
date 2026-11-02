const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export interface SeedTarget {
  host: string;
  database: string;
  isLocal: boolean;
}

export function describeTarget(connectionString: string): SeedTarget {
  const url = new URL(connectionString);
  const host = url.hostname;

  return {
    host,
    database: url.pathname.replace(/^\//, ''),
    isLocal: LOCAL_HOSTS.has(host),
  };
}

// The seed wipes all non-user data, so a remote database must be opted into.
export function assertTargetAllowed(target: SeedTarget, allowRemote: boolean) {
  if (!target.isLocal && !allowRemote) {
    throw new Error(
      `Refusing to seed remote database "${target.database}" on ${target.host}. ` +
        'Pass --allow-remote to seed it.',
    );
  }
}
