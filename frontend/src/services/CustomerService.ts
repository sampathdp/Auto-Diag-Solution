import { BaseService } from './BaseService';

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  gender: string;
  loyalty_points: number;
}

export class CustomerService extends BaseService {
  static async list(params?: any): Promise<Customer[]> {
    return this.get('/customers', params);
  }

  static async find(id: number): Promise<Customer> {
    return this.get(`/customers/${id}`);
  }

  static async create(data: Partial<Customer>): Promise<Customer> {
    return this.post('/customers', data);
  }
}
