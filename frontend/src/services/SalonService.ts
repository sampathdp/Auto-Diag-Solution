import { BaseService } from './BaseService';

export interface Salon {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  is_active: boolean;
  timezone?: string;
  currency?: string;
  number_of_staff?: string;
  number_of_branches?: string;
  plan_id?: number | null;
  plan_name?: string;
  plan_display_name?: string;
  plan_permissions?: string; // JSON string
  custom_permissions?: string | null; // JSON string
  subscription_id?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  sub_status?: string | null;
  grace_period_days?: number;
  created_at: string;
}

export class SalonService extends BaseService {
  static async list(params?: any): Promise<Salon[]> {
    return this.get('/salons', params);
  }

  static async find(id: number): Promise<Salon> {
    return this.get(`/salons/${id}`);
  }

  static async create(data: Partial<Salon>): Promise<Salon> {
    return this.post('/salons', data);
  }

  static async update(id: number, data: Partial<Salon>): Promise<Salon> {
    return this.put(`/salons/${id}`, data);
  }

  static async delete(id: number): Promise<void> {
    // We use the inherited static delete method from BaseService
    return this.httpDelete(`/salons/${id}`);
  }
}
