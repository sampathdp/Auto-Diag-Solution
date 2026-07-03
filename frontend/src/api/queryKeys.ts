export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  appointments: {
    all: ['appointments'] as const,
    list: (filters: any) => ['appointments', 'list', filters] as const,
    details: (id: number) => ['appointments', 'details', id] as const,
  },
  customers: {
    all: ['customers'] as const,
    list: (filters: any) => ['customers', 'list', filters] as const,
    details: (id: number) => ['customers', 'details', id] as const,
  },
  salons: {
    all: ['salons'] as const,
    details: (id: number) => ['salons', 'details', id] as const,
    settings: (id: number) => ['salons', 'settings', id] as const,
  }
} as const;
