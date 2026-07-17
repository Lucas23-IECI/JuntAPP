// Database types for JuntAPP

export type UserRole = 'vecino' | 'dirigente';
export type BoardPosition = 'presidente' | 'secretario' | 'tesorero' | 'dirigente';
export type CuotaStatus = 'al_dia' | 'pendiente';
export type TransactionType = 'ingreso' | 'egreso';
export type AnnouncementCategory = 'urgente' | 'asamblea' | 'beneficio' | 'general';
export type NotificationType = 'asamblea' | 'votacion' | 'cuota' | 'seguridad';

export interface Junta {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  comuna: string | null;
  region: string;
  invite_code: string;
  owner_id: string | null;
  subscription_status: 'pending' | 'authorized' | 'paused' | 'cancelled' | 'past_due';
  subscription_price: number;
  mercadopago_preference_id: string | null;
  mercadopago_payment_id: string | null;
  mercadopago_subscription_id: string | null;
  subscription_next_payment_date: string | null;
  subscription_last_payment_status: string | null;
  subscription_last_synced_at: string | null;
  activated_at: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  junta_id: string;
  name: string;
  rut: string;
  address: string;
  phone: string | null;
  email: string;
  role: UserRole;
  board_position: BoardPosition | null;
  cuota_status: CuotaStatus;
  created_at: string;
}

export interface Transaction {
  id: number;
  junta_id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  created_by: string | null;
  created_at: string;
}

export interface Poll {
  id: string;
  junta_id: string;
  title: string;
  description: string;
  active: boolean;
  options: PollOption[];
  created_at: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes?: number;
}

export interface Vote {
  id: number;
  user_id: string;
  poll_id: string;
  option_id: string;
  created_at: string;
}

export interface Announcement {
  id: number;
  junta_id: string;
  category: AnnouncementCategory;
  title: string;
  content: string;
  date: string;
  author: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  date: string;
  action: string | null;
  created_at: string;
}

export interface TreasuryDocument {
  name: string;
  path: string;
  size: number;
  created_at: string | null;
  signedUrl: string | null;
}
