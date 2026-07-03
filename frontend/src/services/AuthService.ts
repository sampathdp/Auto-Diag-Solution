import { BaseService } from './BaseService';

export class AuthService extends BaseService {
  static async login(credentials: any) {
    return this.post('/auth/login', credentials);
  }

  // Refresh token is sent automatically via HttpOnly cookie
  static async refresh() {
    return this.post('/auth/refresh', {});
  }

  static async getMe() {
    return this.get('/auth/me');
  }
}
