export interface User {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  subscription_tier: 'basic' | 'professional' | 'enterprise';
  stripe_customer_id?: string;
  subscription_status: 'active' | 'cancelled' | 'past_due';
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface LoginData {
  email: string;
  password: string;
}
