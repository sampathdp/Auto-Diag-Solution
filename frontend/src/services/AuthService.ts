import { BaseService } from "./BaseService";

export class AuthService extends BaseService {
  static async login(credentials: { email: string; password: string; totp_code?: string }) {
    return this.post("/auth/login", credentials);
  }

  // Refresh token is sent automatically via HttpOnly cookie
  static async refresh() {
    return this.post("/auth/refresh", {});
  }

  static async getMe() {
    return this.get("/auth/me");
  }

  static async logout() {
    return this.post("/auth/logout", {});
  }

  static async googleLogin(payload: { credential: string }) {
    return this.post("/auth/google", payload);
  }

  static async facebookLogin(payload: { access_token: string }) {
    return this.post("/auth/facebook", payload);
  }

  static async changePassword(payload: { current_password: string; new_password: string }) {
    return this.post("/auth/change-password", payload);
  }
}
