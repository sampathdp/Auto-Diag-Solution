import { BaseService } from './BaseService';

export interface Appointment {
  id: number;
  customer_id: number;
  staff_id: number;
  appointment_date: string;
  start_time: string;
  status: string;
  total_amount: number;
}

export class AppointmentService extends BaseService {
  static async list(params?: any): Promise<Appointment[]> {
    return this.get('/appointments', params);
  }

  static async find(id: number): Promise<Appointment> {
    return this.get(`/appointments/${id}`);
  }

  static async create(data: Partial<Appointment>): Promise<Appointment> {
    return this.post('/appointments', data);
  }

  static async update(id: number, data: Partial<Appointment>): Promise<Appointment> {
    return this.put(`/appointments/${id}`, data);
  }

  static async delete(id: number): Promise<void> {
    return this.httpDelete(`/appointments/${id}`);
  }
}
