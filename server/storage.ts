import { users, type User, type InsertUser } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // Verification code storage for WhatsApp-based 2FA
  setVerification(record: VerificationRecord): Promise<void>;
  getVerification(email: string): Promise<VerificationRecord | undefined>;
  deleteVerification(email: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  currentId: number;
  private verifications: Map<string, VerificationRecord>;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
    this.verifications = new Map();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async setVerification(record: VerificationRecord): Promise<void> {
    this.verifications.set(record.email.toLowerCase(), record);
  }

  async getVerification(email: string): Promise<VerificationRecord | undefined> {
    return this.verifications.get(email.toLowerCase());
  }

  async deleteVerification(email: string): Promise<void> {
    this.verifications.delete(email.toLowerCase());
  }
}

export const storage = new MemStorage();

export interface VerificationRecord {
  email: string;
  phoneNumber: string; // E.164 formatted WhatsApp number
  code: string; // 6-digit string
  expiresAtMs: number;
  attempts: number;
  lastSentAtMs: number;
  verified: boolean;
}
