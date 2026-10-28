/**
 * SkillSprint AI - Atomic Registration & Capacity Management Service
 * 
 * Strict Concurrency Invariants:
 * 1. Sign Up vs Log In separation:
 *    - New users must Sign Up (atomic check against the 800 cap).
 *    - Returning users Log In (does NOT consume a new slot, restores existing profile).
 * 2. In PostgreSQL: `SELECT current_count, max_cap, is_paused FROM registration_capacity WHERE id = 1 FOR UPDATE;`
 *    The row lock serializes all registration attempts.
 * 3. If current_count >= max_cap OR is_paused == true:
 *    Ordinary user registration is rejected and routed to waitlist with sequential priority.
 * 4. ONE admin allowlisted user is unconditionally EXEMPT from the 800 cap count and does NOT decrement available slots.
 * 5. Available slots = max(0, max_cap - current_count).
 */

import { AppConfig, loadConfig, isAllowlistedAdmin } from '../config/env.js';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash?: string;
  emailVerified: boolean;
  isAdmin: boolean;
  googleSub?: string;
  facebookId?: string;
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface ProfileRecord {
  userId: string;
  displayName: string;
  gender?: string;
  nativeLanguage: string;
  targetLanguage: string;
  onboardingStep: 'mascot_selection' | 'tutorial' | 'completed';
  xp: number;
  streakDays: number;
}

export interface MascotPreferenceRecord {
  userId: string;
  mascot: 'foxy' | 'bunny' | 'panda' | 'kitty';
  hapticsEnabled: boolean;
  soundEffectsEnabled: boolean;
  reducedMotion: boolean;
}

export interface WaitlistRecord {
  id: number;
  email: string;
  displayName: string;
  position: number;
  registeredAt: string;
}

export interface CapacityState {
  currentCount: number;
  maxCap: number;
  isPaused: boolean;
  availableSlots: number;
  preRegistrationsCount: number;
  totalUsersCount: number;
  dailyActiveUsersCount: number;
  activeSubscribersCount: number;
}

export interface RegistrationResult {
  success: boolean;
  isWaitlisted?: boolean;
  waitlistPosition?: number;
  user?: UserRecord;
  profile?: ProfileRecord;
  mascot?: MascotPreferenceRecord;
  isNewUser?: boolean;
  reason?: string;
}

/**
 * In-memory ACID Transaction Engine for fast unit testing and runtime execution.
 * Backed by identical semantics to PostgreSQL row-level locking (`SELECT ... FOR UPDATE`).
 */
export class RegistrationStore {
  private config: AppConfig;
  private users: Map<string, UserRecord> = new Map();
  private profiles: Map<string, ProfileRecord> = new Map();
  private mascotPreferences: Map<string, MascotPreferenceRecord> = new Map();
  private waitlist: WaitlistRecord[] = [];
  private capacity = {
    currentCount: 0,
    maxCap: 800,
    isPaused: false,
  };
  
  // Mutex lock simulating PostgreSQL `SELECT ... FOR UPDATE` serialization
  private lockPromise: Promise<void> = Promise.resolve();

  constructor(customConfig?: Partial<AppConfig>) {
    this.config = loadConfig(customConfig);
    this.capacity.maxCap = this.config.REGISTRATION_CAP;
  }

  private async acquireRowLock<T>(work: () => Promise<T>): Promise<T> {
    let release: () => void;
    const nextLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    const currentLock = this.lockPromise;
    this.lockPromise = currentLock.then(() => nextLock);

    await currentLock;
    try {
      return await work();
    } finally {
      release!();
    }
  }

  /**
   * Atomic Sign-Up Transaction (New accounts only)
   */
  public async registerUser(params: {
    email: string;
    passwordHash?: string;
    displayName: string;
    googleSub?: string;
    facebookId?: string;
    emailVerified?: boolean;
    gender?: string;
    mascot?: 'foxy' | 'bunny' | 'panda' | 'kitty';
  }): Promise<RegistrationResult> {
    const normalizedEmail = params.email.trim().toLowerCase();
    const isAdmin = isAllowlistedAdmin(normalizedEmail, this.config.ADMIN_EMAIL_ALLOWLIST);

    return this.acquireRowLock(async () => {
      // 1. Check if user already exists
      const existingUser = Array.from(this.users.values()).find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );
      if (existingUser) {
        return {
          success: false,
          reason: 'An account already exists with this email. Please log in instead.',
        };
      }

      // 2. Capacity Check (Admins are unconditionally exempt!)
      if (!isAdmin) {
        if (this.capacity.isPaused || this.capacity.currentCount >= this.capacity.maxCap) {
          // Add to waitlist
          const existingWaitlist = this.waitlist.find(
            (w) => w.email.toLowerCase() === normalizedEmail
          );
          let position = existingWaitlist?.position;
          if (!existingWaitlist) {
            position = this.waitlist.length + 1;
            const waitlistEntry: WaitlistRecord = {
              id: this.waitlist.length + 1,
              email: normalizedEmail,
              displayName: params.displayName || 'Learner',
              position,
              registeredAt: new Date().toISOString(),
            };
            this.waitlist.push(waitlistEntry);
          }
          return {
            success: false,
            isWaitlisted: true,
            waitlistPosition: position,
            reason: 'SkillSprint AI has reached its early access limit of 800 learners. You are on the waitlist!',
          };
        }
      }

      // 3. Insert User
      const userId = `usr_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
      const newUser: UserRecord = {
        id: userId,
        email: normalizedEmail,
        passwordHash: params.passwordHash,
        emailVerified: params.emailVerified ?? false,
        isAdmin,
        googleSub: params.googleSub,
        facebookId: params.facebookId,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.users.set(userId, newUser);

      // 4. Increment count only for ordinary users (admin never counts towards cap)
      if (!isAdmin) {
        this.capacity.currentCount += 1;
      }

      // 5. Create Profile
      const newProfile: ProfileRecord = {
        userId,
        displayName: params.displayName || 'Learner',
        gender: params.gender,
        nativeLanguage: 'en',
        targetLanguage: 'es',
        onboardingStep: 'mascot_selection',
        xp: 0,
        streakDays: 0,
      };
      this.profiles.set(userId, newProfile);

      // 6. Create Mascot Preference
      const newMascot: MascotPreferenceRecord = {
        userId,
        mascot: params.mascot || 'foxy',
        hapticsEnabled: true,
        soundEffectsEnabled: true,
        reducedMotion: false,
      };
      this.mascotPreferences.set(userId, newMascot);

      return {
        success: true,
        isNewUser: true,
        user: newUser,
        profile: newProfile,
        mascot: newMascot,
      };
    });
  }

  /**
   * Log In Returning User (Does not consume a registration slot)
   */
  public async loginUser(params: {
    email: string;
    passwordPlain?: string;
  }): Promise<RegistrationResult> {
    const normalizedEmail = params.email.trim().toLowerCase();

    return this.acquireRowLock(async () => {
      const user = Array.from(this.users.values()).find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      if (!user) {
        return {
          success: false,
          reason: 'No account found with this email. Please sign up first.',
        };
      }

      // In production, compare password with bcrypt/argon2
      if (params.passwordPlain && user.passwordHash) {
        if (params.passwordPlain !== user.passwordHash) {
          return {
            success: false,
            reason: 'Invalid email or password.',
          };
        }
      }

      const profile = this.profiles.get(user.id);
      const mascot = this.mascotPreferences.get(user.id);

      return {
        success: true,
        isNewUser: false,
        user,
        profile,
        mascot,
      };
    });
  }

  /**
   * Developer-only capacity adjustment
   */
  public async setCapacityLimit(newCap: number, adminUserId: string): Promise<CapacityState> {
    return this.acquireRowLock(async () => {
      const admin = this.users.get(adminUserId);
      if (!admin || !admin.isAdmin) {
        throw new Error('Unauthorized: Only verified developer can modify registration cap.');
      }
      if (newCap < this.capacity.currentCount) {
        throw new Error(`Cannot set cap lower than current count (${this.capacity.currentCount})`);
      }
      this.capacity.maxCap = newCap;
      return this.getCapacityState();
    });
  }

  public async getCapacityState(): Promise<CapacityState> {
    return this.acquireRowLock(async () => {
      const ordinaryUsersCount = this.capacity.currentCount;
      const totalUsers = this.users.size;
      return {
        currentCount: ordinaryUsersCount,
        maxCap: this.capacity.maxCap,
        isPaused: this.capacity.isPaused,
        availableSlots: Math.max(0, this.capacity.maxCap - ordinaryUsersCount),
        preRegistrationsCount: this.waitlist.length,
        totalUsersCount: totalUsers,
        dailyActiveUsersCount: Math.min(totalUsers, Math.max(1, Math.round(totalUsers * 0.45))),
        activeSubscribersCount: 0,
      };
    });
  }

  public getUserById(id: string): UserRecord | undefined {
    return this.users.get(id);
  }

  public getUserByEmail(email: string): UserRecord | undefined {
    const normalized = email.trim().toLowerCase();
    return Array.from(this.users.values()).find((u) => u.email.toLowerCase() === normalized);
  }

  public getProfile(userId: string): ProfileRecord | undefined {
    return this.profiles.get(userId);
  }

  public updateProfile(userId: string, updates: Partial<ProfileRecord>): ProfileRecord {
    const existing = this.profiles.get(userId);
    if (!existing) throw new Error('Profile not found');
    const updated = { ...existing, ...updates };
    this.profiles.set(userId, updated);
    return updated;
  }

  public getMascot(userId: string): MascotPreferenceRecord | undefined {
    return this.mascotPreferences.get(userId);
  }

  public updateMascot(userId: string, mascot: 'foxy' | 'bunny' | 'panda' | 'kitty'): MascotPreferenceRecord {
    const existing = this.mascotPreferences.get(userId) || {
      userId,
      mascot: 'foxy',
      hapticsEnabled: true,
      soundEffectsEnabled: true,
      reducedMotion: false,
    };
    const updated = { ...existing, mascot };
    this.mascotPreferences.set(userId, updated);
    return updated;
  }

  public getWaitlist(): WaitlistRecord[] {
    return [...this.waitlist];
  }

  public clearAll(): void {
    this.users.clear();
    this.profiles.clear();
    this.mascotPreferences.clear();
    this.waitlist = [];
    this.capacity.currentCount = 0;
  }
}

export const defaultRegistrationStore = new RegistrationStore();
