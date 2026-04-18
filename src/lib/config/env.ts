type ServiceName = 'jackett' | 'tmdb' | 'sonarr' | 'radarr';

type ServiceConfig = {
  name: ServiceName;
  label: string;
  required: string[];
};

const SERVICES: ServiceConfig[] = [
  { name: 'jackett', label: 'Jackett', required: ['JACKETT_URL', 'JACKETT_API_KEY'] },
  { name: 'tmdb', label: 'TMDB', required: ['TMDB_API_KEY'] },
  { name: 'sonarr', label: 'Sonarr', required: ['SONARR_URL', 'SONARR_API_KEY'] },
  { name: 'radarr', label: 'Radarr', required: ['RADARR_URL', 'RADARR_API_KEY'] },
];

export type ServiceConfigStatus = {
  name: ServiceName;
  label: string;
  configured: boolean;
  missing: string[];
};

export function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function requireEnv(name: string, serviceLabel: string): string {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`${serviceLabel} is missing required environment variable ${name}`);
  }
  return value;
}

export function getServiceConfigStatus(): ServiceConfigStatus[] {
  return SERVICES.map((service) => {
    const missing = service.required.filter((key) => !getEnv(key));
    return {
      name: service.name,
      label: service.label,
      configured: missing.length === 0,
      missing,
    };
  });
}

export function isServiceConfigured(name: ServiceName): boolean {
  return getServiceConfigStatus().find((service) => service.name === name)?.configured ?? false;
}

