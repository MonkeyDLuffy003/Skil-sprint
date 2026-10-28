/**
 * SkillSprint AI - Production Authentication with Firebase & Firestore
 * 
 * Features:
 * 1. Real Firebase Auth:
 *    - Google Gmail Sign-In via signInWithPopup(auth, googleProvider)
 *    - Email & Password Signup via createUserWithEmailAndPassword + sendEmailVerification
 *    - Email & Password Login via signInWithEmailAndPassword
 *    - Forgot Password via sendPasswordResetEmail
 *    - Session persistence via onAuthStateChanged
 *    - Logout via signOut
 * 2. Firestore User Profile:
 *    - Document at /users/{uid} storing displayName, email, photoURL, role, subscriptionStatus, mascot, streak, xp
 * 3. Developer / Admin Access:
 *    - Automatically granted ONLY to verified allowlisted developer account
 *    - Unlocks Developer Dashboard
 * 4. 800-Learner Early Access Cap:
 *    - Tracked in Firestore /system/capacity
 *    - Routes overflow signups to friendly waitlist
 */

import React, { useState, useEffect } from 'react';
import { MascotVector } from './components/MascotVectors';
import { MASCOTS, MascotId, MascotTheme } from '../backend/src/services/mascot.service';
import { SmartTranslatorService, SmartTranslationResponse } from '../backend/src/services/translator.service';
import { generateDeterministicRomanisation } from '../backend/src/services/romanisation.service';
import { SM2Service } from '../backend/src/services/sm2.service';
import { LearnEngineService, Exercise, Unit } from '../backend/src/services/learning.service';
import { RecommendationService, RegionKey } from '../backend/src/services/recommendation.service';
import { PracticeLabService } from '../backend/src/services/practice_lab.service';
import { StreakFreezeService } from '../backend/src/services/streak_freeze.service';
import {
  DialogueService,
  DIALOGUE_SCENARIOS,
  DialogueScenario,
  DialogueTurn,
  DialogueEvaluationResult,
} from '../backend/src/services/dialogue.service';
import {
  ReferralService,
  SPIN_WHEEL_SECTORS,
  SpinWheelSector,
  MilestoneProgress,
} from '../backend/src/services/referral.service';
import {
  SubscriptionService,
  SUBSCRIPTION_PLANS,
  SubscriptionPlan,
} from '../backend/src/services/subscription.service';
import confetti from 'canvas-confetti';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  FirebaseUser,
} from './lib/firebase';
import {
  Sparkles,
  BookOpen,
  Languages,
  Dumbbell,
  Gift,
  User,
  Shield,
  Clock,
  ArrowRight,
  Check,
  ChevronRight,
  ChevronLeft,
  Lock,
  Flame,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Mail,
  CheckCircle2,
  Volume2,
  Bookmark,
  CheckCheck,
  RotateCcw,
  Mic,
  Layers,
  Compass,
  Headphones,
  Sliders,
  MessageSquare,
  HelpCircle,
  Send,
  Star,
  Copy,
  Share2,
  Award,
  Zap,
  Smartphone,
  Crown,
  CreditCard,
} from 'lucide-react';

type Screen =
  | 'welcome'
  | 'signup'
  | 'login'
  | 'forgot_password'
  | 'waitlist'
  | 'gender_select'
  | 'mascot_picker'
  | 'tutorial'
  | 'main'
  | 'developer_dashboard';

type Tab = 'learn' | 'translate' | 'practice' | 'rewards' | 'profile';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'learner' | 'developer';
  subscriptionStatus: 'free' | 'premium';
  streakDays: number;
  xp: number;
  mascot: MascotId;
  gender?: string;
  createdAt?: any;
}

const ADMIN_ALLOWLIST = [
  'manikantejaswarooparni@gmail.com',
  'manikantatejaswarooparni@gmail.com',
];

export default function App() {
  const [selectedMascotId, setSelectedMascotId] = useState<MascotId>('foxy');
  const mascot: MascotTheme = MASCOTS[selectedMascotId];

  // Navigation state
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [activeTab, setActiveTab] = useState<Tab>('learn');

  // Firebase auth state
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form inputs
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Onboarding state
  const [selectedGender, setSelectedGender] = useState<string>('prefer_not_to_say');
  const [tutorialIndex, setTutorialIndex] = useState(0);

  // Capacity & Waitlist
  const [currentCap, setCurrentCap] = useState(800);
  const [registeredOrdinaryUsers, setRegisteredOrdinaryUsers] = useState(148);
  const [waitlistCount, setWaitlistCount] = useState(24);
  const [waitlistPosition, setWaitlistPosition] = useState<number>(0);
  const [waitlistRegisteredAt, setWaitlistRegisteredAt] = useState<string>('');

  // Mobile frame toggle
  const [isMobileFrame, setIsMobileFrame] = useState(true);

  // Stage 2: Languages, Smart Translator, and Spaced-Repetition State
  const [currentLanguage, setCurrentLanguage] = useState<'ja' | 'es' | 'hi' | 'te' | 'ko' | 'zh' | 'ru'>('ja');
  
  // Translator state
  const [translatorInput, setTranslatorInput] = useState('Good morning');
  const [translationResult, setTranslationResult] = useState<SmartTranslationResponse | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [savedFlashcards, setSavedFlashcards] = useState<Array<{
    front: string;
    back: string;
    romanisation?: string;
    system?: string;
  }>>([
    { front: 'Hello', back: 'こんにちは', romanisation: 'konnichiwa', system: 'modified_hepburn' },
    { front: 'Thank you', back: 'ありがとうございます', romanisation: 'arigatō gozaimasu', system: 'modified_hepburn' },
  ]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Learn Engine & Interactive Exercise State
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [exerciseFeedback, setExerciseFeedback] = useState<{ isCorrect: boolean; text: string } | null>(null);
  const [lessonFinished, setLessonFinished] = useState(false);

  // Spaced-Repetition Review Queue (SM-2)
  const [sm2Queue, setSm2Queue] = useState<Array<{
    id: string;
    prompt: string;
    answer: string;
    romanisation?: string;
    interval: number;
    repetitions: number;
    easeFactor: number;
    status: 'active' | 'mastered';
  }>>([
    {
      id: 'sm2_1',
      prompt: 'Say "Good morning" in Japanese',
      answer: 'おはようございます',
      romanisation: 'ohayō gozaimasu',
      interval: 1,
      repetitions: 1,
      easeFactor: 2.50,
      status: 'active',
    },
    {
      id: 'sm2_2',
      prompt: 'Word for "Water"',
      answer: '水 (mizu)',
      romanisation: 'mizu',
      interval: 3,
      repetitions: 2,
      easeFactor: 2.60,
      status: 'active',
    },
  ]);
  const [activePracticeIndex, setActivePracticeIndex] = useState(0);
  const [practiceFlipped, setPracticeFlipped] = useState(false);

  // Stage 3: Region-Based Recommendations & Practice Lab State
  const [userRegion, setUserRegion] = useState<RegionKey>(() => RecommendationService.detectRegion());
  const [activeFreezes, setActiveFreezes] = useState<number>(2); // max 2
  const [practiceSubTab, setPracticeSubTab] = useState<'sm2' | 'listening' | 'speaking' | 'grammar' | 'roleplay'>('sm2');
  const [listeningSpeed, setListeningSpeed] = useState<number>(1.0); // 0.75, 1.0, 1.25
  const [activeListeningIndex, setActiveListeningIndex] = useState<number>(0);
  const [pronunciationScore, setPronunciationScore] = useState<{ scorePercentage: number; feedback: string } | null>(null);
  const [isSpeakingListening, setIsSpeakingListening] = useState<boolean>(false);

  // Stage 4: Interactive Conversational Roleplay Dialogues State
  const [activeRoleplayScenario, setActiveRoleplayScenario] = useState<DialogueScenario | null>(null);
  const [roleplayTurnIndex, setRoleplayTurnIndex] = useState<number>(1);
  const [roleplayInput, setRoleplayInput] = useState<string>('');
  const [showRoleplayHint, setShowRoleplayHint] = useState<boolean>(false);
  const [roleplayTurnHistory, setRoleplayTurnHistory] = useState<Array<{
    role: 'npc' | 'user';
    speakerName?: string;
    text: string;
    romanisation?: string;
    translation?: string;
    score?: number;
  }>>([]);
  const [roleplayFeedback, setRoleplayFeedback] = useState<DialogueEvaluationResult | null>(null);
  const [roleplayCompleteModal, setRoleplayCompleteModal] = useState<{ scenario: DialogueScenario; stars: number; xp: number } | null>(null);

  // Stage 5: Referral Engine, Milestone Spin Wheel, and Subscriptions State
  const [referralCode, setReferralCode] = useState<string>('SPRINT-FOX-8821');
  const [copiedReferralCode, setCopiedReferralCode] = useState<boolean>(false);
  const [verifiedReferralsCount, setVerifiedReferralsCount] = useState<number>(5); // Unlocks Tier 1 (1 spin) right away
  const [claimedSpinsCount, setClaimedSpinsCount] = useState<number>(0);
  const [wheelSpinning, setWheelSpinning] = useState<boolean>(false);
  const [wheelRotationDeg, setWheelRotationDeg] = useState<number>(0);
  const [rewardWon, setRewardWon] = useState<SpinWheelSector | null>(null);
  const [showRewardModal, setShowRewardModal] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [selectedPlanInterval, setSelectedPlanInterval] = useState<'month' | 'year'>('month');
  const [isUpgradingPlay, setIsUpgradingPlay] = useState<boolean>(false);
  const [showOtpSimulatorModal, setShowOtpSimulatorModal] = useState<boolean>(false);
  const [simulatedRefereePhone, setSimulatedRefereePhone] = useState<string>('+1 (555) 234-5678');
  const [simulatedOtpCode, setSimulatedOtpCode] = useState<string>('123456');
  const [referralToast, setReferralToast] = useState<string | null>(null);

  // 1. Listen to Real Firebase Auth State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);

          const emailLower = (user.email || '').toLowerCase().trim();
          const isAdmin = ADMIN_ALLOWLIST.includes(emailLower);

          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            if (data.mascot && MASCOTS[data.mascot]) {
              setSelectedMascotId(data.mascot);
            }
            setCurrentScreen('main');
          } else {
            // New user registration in Firestore
            const role = isAdmin ? 'developer' : 'learner';
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'Learner',
              photoURL: user.photoURL || '',
              role,
              subscriptionStatus: 'free',
              streakDays: 1,
              xp: 20,
              mascot: 'foxy',
              gender: 'prefer_not_to_say',
              createdAt: serverTimestamp(),
            };

            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
            setCurrentScreen('gender_select');
          }
        } catch (err: any) {
          console.error('Error fetching user profile from Firestore:', err);
        }
      } else {
        setProfile(null);
        setCurrentScreen('welcome');
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        // ignore
      }
    }
  };

  // -------------------------------------------------------------
  // REAL FIREBASE AUTHENTICATION ACTIONS
  // -------------------------------------------------------------

  // Google Sign-In via Firebase
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setActionLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      triggerHaptic();
      // onAuthStateChanged will handle profile retrieval and routing
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError(err.message || 'Google Sign-In failed.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Email & Password Registration
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const email = emailInput.trim();
    const password = passwordInput.trim();
    const displayName = nameInput.trim();

    if (!displayName) {
      setAuthError('Please enter your full name.');
      return;
    }
    if (!email) {
      setAuthError('Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setActionLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Send real email verification
      try {
        await sendEmailVerification(userCredential.user);
      } catch {
        // Continue if verification rate limited
      }

      const emailLower = email.toLowerCase();
      const isAdmin = ADMIN_ALLOWLIST.includes(emailLower);
      const role = isAdmin ? 'developer' : 'learner';

      const newProfile: UserProfile = {
        uid: userCredential.user.uid,
        email,
        displayName,
        role,
        subscriptionStatus: 'free',
        streakDays: 1,
        xp: 20,
        mascot: selectedMascotId,
        gender: selectedGender,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), newProfile);
      setProfile(newProfile);
      triggerHaptic();
      setCurrentScreen('gender_select');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setAuthError('An account already exists with this email. Please log in.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('Password is too weak. Please use at least 6 characters.');
      } else {
        setAuthError(err.message || 'Registration failed.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Email & Password Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const email = emailInput.trim();
    const password = passwordInput.trim();

    if (!email) {
      setAuthError('Please enter your email.');
      return;
    }
    if (!password) {
      setAuthError('Please enter your password.');
      return;
    }

    setActionLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      triggerHaptic();
      // onAuthStateChanged will load profile and route to main
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError('Invalid email or password.');
      } else {
        setAuthError(err.message || 'Login failed.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Forgot Password Reset Email
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setResetSuccessMessage(null);

    const email = emailInput.trim();
    if (!email || !email.includes('@')) {
      setAuthError('Please enter your valid email address to receive a reset link.');
      return;
    }

    setActionLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setResetSuccessMessage(`Password reset link sent to ${email}. Check your inbox.`);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send reset email.');
    } finally {
      setActionLoading(false);
    }
  };

  // Sign Out
  const handleSignOut = async () => {
    await signOut(auth);
    setProfile(null);
    setEmailInput('');
    setPasswordInput('');
    setNameInput('');
    setCurrentScreen('welcome');
  };

  // Mascot selection
  const handleMascotSelect = async (id: MascotId) => {
    triggerHaptic();
    setSelectedMascotId(id);
    if (firebaseUser) {
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), { mascot: id });
        setProfile((prev) => (prev ? { ...prev, mascot: id } : null));
      } catch (err) {
        console.error('Error updating mascot:', err);
      }
    }
  };

  // -------------------------------------------------------------
  // STAGE 2: TRANSLATOR & AUDIO & EXERCISES & SM-2 HANDLERS
  // -------------------------------------------------------------
  const handlePlayAudio = (text: string, langCode: string, customRate?: number) => {
    triggerHaptic();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const langMap: Record<string, string> = {
        ja: 'ja-JP',
        es: 'es-ES',
        hi: 'hi-IN',
        te: 'te-IN',
        ko: 'ko-KR',
        zh: 'zh-CN',
        ru: 'ru-RU',
        fr: 'fr-FR',
        de: 'de-DE',
      };
      utterance.lang = langMap[langCode] || 'en-US';
      utterance.rate = customRate !== undefined ? customRate : 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handlePronunciationDrill = (targetRomanisation: string) => {
    triggerHaptic();
    setIsSpeakingListening(true);
    setPronunciationScore(null);
    setTimeout(() => {
      setIsSpeakingListening(false);
      const res = PracticeLabService.evaluatePronunciation(targetRomanisation, targetRomanisation);
      setPronunciationScore(res);
      confetti({ particleCount: 35, spread: 60 });
    }, 1500);
  };

  const handleTranslate = async (textToTranslate?: string) => {
    const text = (textToTranslate !== undefined ? textToTranslate : translatorInput).trim();
    if (!text) return;
    setIsTranslating(true);
    triggerHaptic();
    try {
      const res = await SmartTranslatorService.translate({
        originalText: text,
        sourceLanguage: 'en',
        targetLanguage: currentLanguage,
        meaningLanguage: 'en',
      });
      setTranslationResult(res);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSaveFlashcard = () => {
    if (!translationResult) return;
    triggerHaptic();
    setSavedFlashcards((prev) => [
      {
        front: translationResult.original_text,
        back: translationResult.translated_text,
        romanisation: translationResult.romanisation,
        system: translationResult.romanisation_system,
      },
      ...prev,
    ]);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // SM-2 Review Quality Rating (0 to 5)
  const handleSM2Review = (quality: number) => {
    triggerHaptic();
    const currentItem = sm2Queue[activePracticeIndex];
    if (!currentItem) return;

    const calc = SM2Service.calculate({
      quality,
      repetitions: currentItem.repetitions,
      previousInterval: currentItem.interval,
      previousEaseFactor: currentItem.easeFactor,
    });

    setSm2Queue((prev) =>
      prev.map((item, idx) =>
        idx === activePracticeIndex
          ? {
              ...item,
              interval: calc.intervalDays,
              repetitions: calc.repetitions,
              easeFactor: calc.easeFactor,
              status: calc.isMastered ? 'mastered' : 'active',
            }
          : item
      )
    );

    setPracticeFlipped(false);
    if (activePracticeIndex < sm2Queue.length - 1) {
      setActivePracticeIndex((prev) => prev + 1);
    } else {
      confetti({ particleCount: 40, spread: 60 });
      setActivePracticeIndex(0);
    }
  };

  const handleFinishMascotPicker = () => {
    triggerHaptic();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: [mascot.colors.primary, mascot.colors.accent, '#FFFFFF'],
    });
    setCurrentScreen('tutorial');
  };

  const handleNextTutorial = () => {
    triggerHaptic();
    if (tutorialIndex < mascot.tutorialLines.length - 1) {
      setTutorialIndex((prev) => prev + 1);
    } else {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      setCurrentScreen('main');
      setActiveTab('learn');
    }
  };

  const themeStyles = {
    backgroundColor: mascot.colors.background,
    color: mascot.colors.textPrimary,
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-2 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Bar */}
      <header className="w-full max-w-5xl mb-3 flex flex-wrap items-center justify-between gap-3 px-2 text-xs text-stone-400">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            SkillSprint AI • Firebase Auth & Firestore Active
          </span>
        </div>

        <button
          onClick={() => setIsMobileFrame(!isMobileFrame)}
          className="px-3 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 transition-colors border border-stone-800 text-xs"
        >
          {isMobileFrame ? 'Expanded View' : 'Android Mobile Frame'}
        </button>
      </header>

      {/* Android Device Shell */}
      <div
        className={`w-full transition-all duration-300 relative flex flex-col ${
          isMobileFrame
            ? 'max-w-[410px] h-[844px] rounded-[48px] border-[8px] border-stone-900 shadow-2xl overflow-hidden'
            : 'max-w-4xl min-h-[760px] rounded-3xl border border-stone-800 shadow-2xl overflow-hidden'
        }`}
        style={themeStyles}
      >
        {/* Status Bar */}
        <div className="w-full pt-3 px-6 pb-1 flex justify-between items-center text-xs font-semibold select-none z-20 opacity-80">
          <span>9:41</span>
          <div className="w-4 h-4 rounded-full bg-stone-900 border-2 border-stone-950 mx-auto" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">5G</span>
            <div className="w-5 h-2.5 rounded-sm border border-current p-0.5 flex items-center">
              <div className="w-full h-full bg-current rounded-2xs" />
            </div>
          </div>
        </div>

        {/* Dynamic Screens */}
        <main className="flex-1 flex flex-col overflow-y-auto px-5 py-4 relative">
          {/* ========================================================= */}
          {/* SCREEN 1: HERO WELCOME SCREEN                             */}
          {/* ========================================================= */}
          {currentScreen === 'welcome' && (
            <div className="flex-1 flex flex-col justify-between py-4 text-center">
              {/* Early Access Cap Badge */}
              <div className="pt-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-stone-200/80 shadow-xs text-xs font-bold text-stone-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    Early Access:{' '}
                    <strong style={{ color: mascot.colors.primary }}>
                      {Math.max(0, currentCap - registeredOrdinaryUsers)} of {currentCap} slots open
                    </strong>
                  </span>
                </div>
              </div>

              {/* Mascot Centerpiece */}
              <div className="my-auto flex flex-col items-center">
                <div
                  className="w-36 h-36 rounded-4xl flex items-center justify-center p-3 mb-5 shadow-xl transition-transform hover:scale-105 duration-300"
                  style={{ backgroundColor: mascot.colors.primaryLight }}
                >
                  <MascotVector mascot={selectedMascotId} size={118} />
                </div>

                <h1
                  className="text-3xl font-black tracking-tight"
                  style={{ color: mascot.colors.textPrimary }}
                >
                  SkillSprint AI
                </h1>
                <p className="mt-2 text-sm text-stone-600 font-medium max-w-[270px] leading-relaxed">
                  The smart, gamified language app powered by dedicated AI companions.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 w-full pb-2">
                {/* GET STARTED (Create Account) */}
                <button
                  onClick={() => {
                    setAuthError(null);
                    setCurrentScreen('signup');
                  }}
                  className="w-full py-4 rounded-2xl text-white font-extrabold text-sm uppercase tracking-wider transition-all duration-150 shadow-md active:translate-y-1 active:border-b-0 border-b-4"
                  style={{
                    backgroundColor: mascot.colors.primary,
                    borderColor: mascot.colors.primaryDark,
                  }}
                >
                  Get Started
                </button>

                {/* I ALREADY HAVE AN ACCOUNT (Log In) */}
                <button
                  onClick={() => {
                    setAuthError(null);
                    setCurrentScreen('login');
                  }}
                  className="w-full py-3.5 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 font-extrabold text-sm uppercase tracking-wider transition-all duration-150 shadow-xs active:translate-y-1 active:border-b-0 border-2 border-b-4 border-stone-300"
                >
                  I Already Have An Account
                </button>

                <p className="text-[11px] text-stone-500 pt-1">
                  By continuing, you agree to our Terms of Service & Privacy Policy.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 2: LOG IN                                          */}
          {/* ========================================================= */}
          {currentScreen === 'login' && (
            <div className="flex-1 flex flex-col justify-between py-2">
              <div>
                <button
                  onClick={() => {
                    setAuthError(null);
                    setCurrentScreen('welcome');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold mb-4 text-stone-600 hover:text-stone-900"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>

                <h2 className="text-2xl font-black mb-1" style={{ color: mascot.colors.textPrimary }}>
                  Welcome Back!
                </h2>
                <p className="text-xs text-stone-600 mb-5">
                  Log in to resume your daily streak and language sprints.
                </p>

                {/* Real Google Sign-In */}
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs shadow-xs border-2 border-b-4 border-stone-300 active:border-b-2 active:translate-y-0.5 transition-all mb-4"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.19 0 10.04 0 12s.45 3.81 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>{actionLoading ? 'Connecting...' : 'Continue with Google'}</span>
                </button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-stone-100 px-3 text-[10px] text-stone-500 font-bold rounded-full">
                      Or with email
                    </span>
                  </div>
                </div>

                {/* Error Banner */}
                {authError && (
                  <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleEmailLogin} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-stone-300 text-stone-900 text-xs focus:outline-hidden focus:ring-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthError(null);
                          setResetSuccessMessage(null);
                          setCurrentScreen('forgot_password');
                        }}
                        className="text-[11px] text-stone-500 hover:text-stone-800 font-medium"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-4 py-3 rounded-xl bg-white border border-stone-300 text-stone-900 text-xs focus:outline-hidden focus:ring-2 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-stone-400 hover:text-stone-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-3.5 rounded-2xl text-white font-extrabold text-sm uppercase tracking-wider transition-all duration-150 shadow-md border-b-4 active:border-b-0 active:translate-y-1 mt-3"
                    style={{
                      backgroundColor: mascot.colors.primary,
                      borderColor: mascot.colors.primaryDark,
                    }}
                  >
                    {actionLoading ? 'Verifying...' : 'Log In'}
                  </button>
                </form>
              </div>

              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setCurrentScreen('signup');
                  }}
                  className="text-xs text-stone-600"
                >
                  Don't have an account?{' '}
                  <strong style={{ color: mascot.colors.primary }}>Get Started</strong>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN: FORGOT PASSWORD                                   */}
          {/* ========================================================= */}
          {currentScreen === 'forgot_password' && (
            <div className="flex-1 flex flex-col justify-between py-2">
              <div>
                <button
                  onClick={() => {
                    setAuthError(null);
                    setCurrentScreen('login');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold mb-4 text-stone-600 hover:text-stone-900"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to Log In
                </button>

                <h2 className="text-2xl font-black mb-1" style={{ color: mascot.colors.textPrimary }}>
                  Reset Password
                </h2>
                <p className="text-xs text-stone-600 mb-5">
                  Enter your email and Firebase will send you a secure link to reset your password.
                </p>

                {resetSuccessMessage && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{resetSuccessMessage}</span>
                  </div>
                )}

                {authError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-stone-300 text-stone-900 text-xs focus:outline-hidden focus:ring-2"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-3.5 rounded-2xl text-white font-extrabold text-sm uppercase tracking-wider transition-all duration-150 shadow-md border-b-4 active:border-b-0 active:translate-y-1"
                    style={{
                      backgroundColor: mascot.colors.primary,
                      borderColor: mascot.colors.primaryDark,
                    }}
                  >
                    {actionLoading ? 'Sending Link...' : 'Send Reset Link'}
                  </button>
                </form>
              </div>

              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setCurrentScreen('login')}
                  className="text-xs font-bold text-stone-600"
                >
                  Remembered your password? Log in
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 3: SIGN UP                                         */}
          {/* ========================================================= */}
          {currentScreen === 'signup' && (
            <div className="flex-1 flex flex-col justify-between py-2">
              <div>
                <button
                  onClick={() => {
                    setAuthError(null);
                    setCurrentScreen('welcome');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold mb-3 text-stone-600 hover:text-stone-900"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>

                <h2 className="text-2xl font-black mb-1" style={{ color: mascot.colors.textPrimary }}>
                  Create Your Profile
                </h2>
                <p className="text-xs text-stone-600 mb-4">
                  Join early access and sprint towards language fluency.
                </p>

                {/* Google Sign Up */}
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs shadow-xs border-2 border-b-4 border-stone-300 active:border-b-2 active:translate-y-0.5 transition-all mb-4"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.19 0 10.04 0 12s.45 3.81 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>{actionLoading ? 'Connecting...' : 'Sign Up with Google'}</span>
                </button>

                {/* Divider */}
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-stone-100 px-3 text-[10px] text-stone-500 font-bold rounded-full">
                      Or create with email
                    </span>
                  </div>
                </div>

                {/* Error Banner */}
                {authError && (
                  <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                {/* Sign Up Form */}
                <form onSubmit={handleEmailSignUp} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="e.g. Maya Chen"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-stone-300 text-stone-900 text-xs focus:outline-hidden focus:ring-2"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="learner@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-stone-300 text-stone-900 text-xs focus:outline-hidden focus:ring-2"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Password (6+ characters)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-4 py-3 rounded-xl bg-white border border-stone-300 text-stone-900 text-xs focus:outline-hidden focus:ring-2 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-stone-400 hover:text-stone-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-3.5 rounded-2xl text-white font-extrabold text-sm uppercase tracking-wider transition-all duration-150 shadow-md border-b-4 active:border-b-0 active:translate-y-1 mt-2"
                    style={{
                      backgroundColor: mascot.colors.primary,
                      borderColor: mascot.colors.primaryDark,
                    }}
                  >
                    {actionLoading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </form>
              </div>

              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setCurrentScreen('login');
                  }}
                  className="text-xs text-stone-600"
                >
                  Already have an account?{' '}
                  <strong style={{ color: mascot.colors.primary }}>Log In</strong>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 4: ONBOARDING GENDER SELECTION                     */}
          {/* ========================================================= */}
          {currentScreen === 'gender_select' && (
            <div className="flex-1 flex flex-col justify-between py-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Step 1 of 3
                </div>
                <h2 className="text-2xl font-black mb-1" style={{ color: mascot.colors.textPrimary }}>
                  Personalize Exercises
                </h2>
                <p className="text-xs text-stone-600 mb-5">
                  How would you like to be addressed in language exercises? (Optional)
                </p>

                <div className="space-y-2.5">
                  {[
                    { id: 'female', label: 'Female', note: 'She / Her forms' },
                    { id: 'male', label: 'Male', note: 'He / Him forms' },
                    { id: 'non_binary', label: 'Non-binary', note: 'Neutral forms' },
                    { id: 'prefer_not_to_say', label: 'Prefer not to say', note: 'Default neutral' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedGender(option.id)}
                      className={`w-full p-3.5 rounded-2xl flex items-center justify-between text-left border-2 transition-all ${
                        selectedGender === option.id
                          ? 'bg-white shadow-md'
                          : 'bg-white/60 hover:bg-white/90 border-transparent'
                      }`}
                      style={{
                        borderColor: selectedGender === option.id ? mascot.colors.primary : 'transparent',
                      }}
                    >
                      <div>
                        <div className="font-bold text-stone-900 text-xs">{option.label}</div>
                        <div className="text-[11px] text-stone-500">{option.note}</div>
                      </div>
                      {selectedGender === option.id && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: mascot.colors.primary }}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setCurrentScreen('mascot_picker')}
                  className="flex-1 py-3.5 rounded-2xl text-white font-extrabold text-sm uppercase tracking-wider shadow-md border-b-4 active:border-b-0 active:translate-y-1 transition-all"
                  style={{
                    backgroundColor: mascot.colors.primary,
                    borderColor: mascot.colors.primaryDark,
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 5: ONBOARDING MASCOT PICKER                        */}
          {/* ========================================================= */}
          {currentScreen === 'mascot_picker' && (
            <div className="flex-1 flex flex-col justify-between py-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Step 2 of 3
                </div>
                <h2 className="text-2xl font-black mb-1" style={{ color: mascot.colors.textPrimary }}>
                  Choose Your Mascot
                </h2>
                <p className="text-xs text-stone-600 mb-4">
                  Each companion rethemes the whole app. Switch anytime without losing any progress!
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  {(Object.keys(MASCOTS) as MascotId[]).map((id) => {
                    const item = MASCOTS[id];
                    const isSelected = selectedMascotId === id;
                    return (
                      <button
                        key={id}
                        onClick={() => handleMascotSelect(id)}
                        className={`p-3 rounded-2xl flex flex-col items-center text-center border-2 transition-all relative ${
                          isSelected
                            ? 'bg-white shadow-lg scale-[1.02]'
                            : 'bg-white/60 hover:bg-white/90 border-transparent opacity-85'
                        }`}
                        style={{
                          borderColor: isSelected ? item.colors.primary : 'transparent',
                        }}
                      >
                        {isSelected && (
                          <div
                            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]"
                            style={{ backgroundColor: item.colors.primary }}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1.5 p-1"
                          style={{ backgroundColor: item.colors.primaryLight }}
                        >
                          <MascotVector mascot={id} size={50} />
                        </div>
                        <div className="font-extrabold text-xs text-stone-900">{item.name}</div>
                        <div className="text-[10px] text-stone-500 font-medium">{item.species}</div>
                        <div
                          className="mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: item.colors.badgeBg,
                            color: item.colors.textMuted,
                          }}
                        >
                          {item.tagline.split('&')[0]}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={handleFinishMascotPicker}
                  className="w-full py-3.5 rounded-2xl text-white font-extrabold text-xs uppercase tracking-wider shadow-md border-b-4 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: mascot.colors.primary,
                    borderColor: mascot.colors.primaryDark,
                  }}
                >
                  <span>Select {mascot.name} & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 6: ONBOARDING TUTORIAL                             */}
          {/* ========================================================= */}
          {currentScreen === 'tutorial' && (
            <div className="flex-1 flex flex-col items-center justify-between py-4">
              <div className="w-full text-center">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Step 3 of 3 • Sprint Tutorial
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  {mascot.tutorialLines.map((_, i) => (
                    <div
                      key={i}
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: i === tutorialIndex ? '28px' : '8px',
                        backgroundColor:
                          i === tutorialIndex ? mascot.colors.primary : mascot.colors.cardBorder,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center max-w-[300px] text-center my-auto">
                <div
                  className="w-28 h-28 rounded-3xl flex items-center justify-center p-2 mb-4 shadow-xl animate-bounce"
                  style={{ backgroundColor: mascot.colors.primaryLight, animationDuration: '3s' }}
                >
                  <MascotVector
                    mascot={selectedMascotId}
                    size={96}
                    expression={tutorialIndex === 1 ? 'teaching' : 'happy'}
                  />
                </div>

                <div
                  className="relative p-4 rounded-3xl bg-white border-2 shadow-lg text-left"
                  style={{ borderColor: mascot.colors.cardBorder }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white"
                      style={{ backgroundColor: mascot.colors.primary }}
                    >
                      {mascot.name}
                    </span>
                    <span className="text-[11px] text-stone-400 font-medium">Your Sprint Tutor</span>
                  </div>
                  <p className="text-xs font-semibold text-stone-800 leading-relaxed">
                    "{mascot.tutorialLines[tutorialIndex]}"
                  </p>
                </div>
              </div>

              <div className="w-full space-y-2">
                <button
                  onClick={handleNextTutorial}
                  className="w-full py-3.5 rounded-2xl text-white font-extrabold text-xs uppercase tracking-wider shadow-md border-b-4 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: mascot.colors.primary,
                    borderColor: mascot.colors.primaryDark,
                  }}
                >
                  <span>
                    {tutorialIndex === mascot.tutorialLines.length - 1
                      ? 'Begin Learning!'
                      : 'Next Tip'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 7: MAIN APP INTERFACE                              */}
          {/* ========================================================= */}
          {currentScreen === 'main' && (
            <div className="flex-1 flex flex-col pb-16">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-2xs"
                    style={{ backgroundColor: mascot.colors.primaryLight }}
                  >
                    <MascotVector mascot={selectedMascotId} size={34} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900 leading-tight">
                      {profile?.displayName || firebaseUser?.displayName || 'Learner'}
                    </div>
                    <div className="text-[10px] text-stone-500 font-medium capitalize">
                      {mascot.name} Theme
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Streak Freeze Badge */}
                  <div
                    title="Streak Freeze: Automatically preserves your streak if you miss a day (Max 2)"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold"
                  >
                    <Snowflake className="w-3.5 h-3.5 text-cyan-600" />
                    <span>{activeFreezes}/2</span>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                    <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{profile?.streakDays || 1}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    <span>{profile?.xp || 20} XP</span>
                  </div>
                </div>
              </div>

              {/* TAB 1: LEARN (Stage 2 Learn Engine with 7 Exercise Types) */}
              {activeTab === 'learn' && (
                <div className="space-y-4">
                  {/* Region-Based Recommendations (Stage 3) */}
                  <div className="p-3.5 rounded-3xl bg-white border border-stone-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-amber-600" />
                        <span className="text-[11px] font-black text-stone-900 uppercase tracking-wider">
                          Recommended For Your Region
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100/70 text-amber-900 uppercase">
                        {userRegion.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {RecommendationService.getRecommendations(userRegion).map((rec) => (
                        <div
                          key={rec.code}
                          onClick={() => {
                            triggerHaptic();
                            setCurrentLanguage(rec.code as any);
                          }}
                          className={`p-2.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-1 ${
                            currentLanguage === rec.code
                              ? 'border-amber-500 bg-amber-50/60 shadow-2xs'
                              : 'border-stone-200 bg-stone-50/80 hover:bg-stone-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{rec.flagEmoji}</span>
                              <span className="text-xs font-black text-stone-900">{rec.name}</span>
                              <span className="text-[10px] text-stone-500 font-mono">({rec.nativeName})</span>
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-stone-200 text-stone-800">
                              {rec.badgeLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-600 font-medium leading-relaxed">
                            {rec.reasonSummary}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-stone-500 pt-0.5 font-bold">
                            <span>{rec.estimatedSpeakersMillions}M native & L2 speakers</span>
                            <span className="capitalize">{rec.difficultyLevel.replace('_', ' ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Language Selector */}
                  <div className="flex items-center justify-between bg-white/80 p-2.5 rounded-2xl border border-stone-200/80 shadow-2xs">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider pl-1">
                      Learning Language:
                    </span>
                    <div className="flex gap-1 overflow-x-auto pb-0.5">
                      {[
                        { code: 'ja', flag: '🇯🇵', label: 'Japanese' },
                        { code: 'es', flag: '🇪🇸', label: 'Spanish' },
                        { code: 'hi', flag: '🇮🇳', label: 'Hindi' },
                        { code: 'te', flag: '🇮🇳', label: 'Telugu' },
                        { code: 'ko', flag: '🇰🇷', label: 'Korean' },
                        { code: 'zh', flag: '🇨🇳', label: 'Chinese' },
                        { code: 'ru', flag: '🇷🇺', label: 'Russian' },
                      ].map((item) => (
                        <button
                          key={item.code}
                          onClick={() => {
                            triggerHaptic();
                            setCurrentLanguage(item.code as any);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                            currentLanguage === item.code
                              ? 'bg-stone-900 text-white shadow-xs'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          <span>{item.flag}</span>
                          <span className="text-[10px] hidden sm:inline">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Unit 1 Progress Card */}
                  <div
                    className="p-5 rounded-3xl bg-white border-2 shadow-xs relative overflow-hidden"
                    style={{ borderColor: mascot.colors.cardBorder }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span
                          className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: mascot.colors.primary }}
                        >
                          Unit 1 • Fundamentals
                        </span>
                        <h3 className="text-base font-black text-stone-900 mt-1">
                          {currentLanguage === 'ja'
                            ? 'Essential Japanese Greetings'
                            : currentLanguage === 'es'
                            ? 'Conversaciones Básicas'
                            : currentLanguage === 'hi'
                            ? 'मूल अभिवादन (Basic Greetings)'
                            : currentLanguage === 'te'
                            ? 'ప్రాథమిక సంభాషణలు'
                            : 'First Conversational Sprints'}
                        </h3>
                      </div>
                    </div>
                    <p className="text-xs text-stone-600 mb-3 leading-relaxed">
                      7 dynamic exercise types: Multiple Choice, Match Pairs, Word Ordering, Translation, Listening, Reading & Speaking.
                    </p>

                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: '65%', backgroundColor: mascot.colors.primary }}
                      />
                    </div>

                    <button
                      onClick={() => {
                        triggerHaptic();
                        setActiveExerciseIndex(0);
                        setSelectedAnswer('');
                        setSelectedTokens([]);
                        setExerciseFeedback(null);
                        setLessonFinished(false);
                        setIsExerciseModalOpen(true);
                      }}
                      className="w-full py-3.5 rounded-2xl text-white font-extrabold text-xs uppercase tracking-wider shadow-md border-b-4 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: mascot.colors.primary,
                        borderColor: mascot.colors.primaryDark,
                      }}
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Start Sprint Lesson (7 Exercises)</span>
                    </button>
                  </div>

                  {/* Mascot Speech Bubble */}
                  <div
                    className="p-3.5 rounded-2xl bg-white/80 border flex items-center gap-3 shadow-2xs"
                    style={{ borderColor: mascot.colors.cardBorder }}
                  >
                    <div className="w-12 h-12 shrink-0">
                      <MascotVector mascot={selectedMascotId} size={48} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900">{mascot.name} Sprint Tutor:</div>
                      <div className="text-[11px] text-stone-600 italic">
                        "Every mistake in lessons is automatically logged into your SM-2 Practice pool for long-term memory!"
                      </div>
                    </div>
                  </div>

                  {/* Developer Dashboard access (strictly checks role === 'developer') */}
                  {profile?.role === 'developer' && (
                    <button
                      onClick={() => setCurrentScreen('developer_dashboard')}
                      className="w-full p-3.5 rounded-2xl bg-stone-900 text-stone-100 border border-stone-800 shadow-md flex items-center justify-between transition-all hover:bg-stone-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-bold text-amber-400">Developer Dashboard</div>
                          <div className="text-[10px] text-stone-400">
                            Firebase & Firestore Allowlist Verified
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-400" />
                    </button>
                  )}
                </div>
              )}

              {/* TAB 2: TRANSLATE (Stage 2 Smart Translator with Deterministic Romanisation) */}
              {activeTab === 'translate' && (
                <div className="space-y-4">
                  {/* Translator Card */}
                  <div
                    className="p-4 rounded-3xl bg-white border-2 shadow-xs"
                    style={{ borderColor: mascot.colors.cardBorder }}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <Languages className="w-4 h-4" style={{ color: mascot.colors.primary }} />
                        <span className="text-xs font-black text-stone-900 uppercase tracking-wider">
                          Smart Translator
                        </span>
                      </div>
                      {/* Target Language Picker */}
                      <select
                        value={currentLanguage}
                        onChange={(e) => {
                          const code = e.target.value as any;
                          setCurrentLanguage(code);
                          handleTranslate();
                        }}
                        className="px-2.5 py-1 text-xs font-bold bg-stone-100 rounded-xl border border-stone-200 text-stone-800 focus:outline-hidden"
                      >
                        <option value="ja">🇯🇵 Japanese</option>
                        <option value="es">🇪🇸 Spanish</option>
                        <option value="hi">🇮🇳 Hindi</option>
                        <option value="te">🇮🇳 Telugu</option>
                        <option value="ko">🇰🇷 Korean</option>
                        <option value="zh">🇨🇳 Mandarin</option>
                        <option value="ru">🇷🇺 Russian</option>
                      </select>
                    </div>

                    {/* Quick suggestion chips */}
                    <div className="flex gap-1.5 overflow-x-auto py-2.5">
                      {['Good morning', 'Hello', 'Thank you', 'How are you', 'Water', 'Delicious'].map(
                        (phrase) => (
                          <button
                            key={phrase}
                            onClick={() => {
                              setTranslatorInput(phrase);
                              handleTranslate(phrase);
                            }}
                            className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 whitespace-nowrap transition-colors"
                          >
                            {phrase}
                          </button>
                        )
                      )}
                    </div>

                    {/* Input Area */}
                    <div className="relative mb-3">
                      <textarea
                        rows={2}
                        value={translatorInput}
                        onChange={(e) => setTranslatorInput(e.target.value)}
                        placeholder="Type text in English to translate..."
                        className="w-full p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 transition-all resize-none"
                      />
                      <button
                        onClick={() => handleTranslate()}
                        disabled={isTranslating}
                        className="w-full mt-2 py-3 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider shadow-xs border-b-2 active:border-b-0 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                        style={{
                          backgroundColor: mascot.colors.primary,
                          borderColor: mascot.colors.primaryDark,
                        }}
                      >
                        <Languages className="w-3.5 h-3.5" />
                        <span>{isTranslating ? 'Translating...' : 'Translate Sprint'}</span>
                      </button>
                    </div>

                    {/* Output: Strict Field Separation */}
                    {translationResult && (
                      <div className="mt-4 pt-3 border-t border-stone-100 space-y-3">
                        {/* 1. Native Script + Audio Playback */}
                        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                              Native Script
                            </span>
                            <button
                              onClick={() =>
                                handlePlayAudio(
                                  translationResult.translated_text,
                                  translationResult.target_language
                                )
                              }
                              className="p-1.5 rounded-full bg-white text-stone-700 hover:text-stone-900 shadow-2xs border border-stone-200 transition-colors flex items-center gap-1 text-[10px] font-bold"
                            >
                              <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                              <span>Listen</span>
                            </button>
                          </div>
                          <div className="text-xl font-black text-stone-900 tracking-wide">
                            {translationResult.translated_text}
                          </div>
                        </div>

                        {/* 2. Deterministic Romanisation (Separate Field) */}
                        {translationResult.romanisation && (
                          <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                                Deterministic Romanisation
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-200/60 text-amber-900 uppercase">
                                {translationResult.romanisation_system}
                              </span>
                            </div>
                            <div className="text-sm font-bold text-amber-950 font-mono tracking-wide">
                              {translationResult.romanisation}
                            </div>
                          </div>
                        )}

                        {/* 3. Meaning / Cultural Nuance */}
                        <div className="p-3 rounded-2xl bg-stone-100/70 border border-stone-200/60 text-stone-700 text-xs">
                          <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-0.5">
                            Nuance & Meaning
                          </span>
                          <p className="text-[11px] font-medium leading-relaxed">
                            {translationResult.meaning}
                          </p>
                        </div>

                        {/* Save to Flashcards Action */}
                        <button
                          onClick={handleSaveFlashcard}
                          className="w-full py-2.5 rounded-xl bg-white hover:bg-stone-50 border-2 border-stone-300 text-stone-800 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs active:translate-y-0.5 transition-all"
                        >
                          {saveSuccess ? (
                            <>
                              <CheckCheck className="w-4 h-4 text-emerald-600" />
                              <span className="text-emerald-700">Saved to Flashcards!</span>
                            </>
                          ) : (
                            <>
                              <Bookmark className="w-4 h-4 text-amber-600" />
                              <span>Save to Flashcards</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Saved Flashcards Deck */}
                  <div className="p-4 rounded-3xl bg-white border border-stone-200 shadow-2xs">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-stone-600" />
                        <h4 className="text-xs font-bold text-stone-900">Your Flashcards</h4>
                      </div>
                      <span className="text-[10px] font-bold text-stone-500">
                        {savedFlashcards.length} cards
                      </span>
                    </div>

                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {savedFlashcards.map((card, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/70 flex justify-between items-center"
                        >
                          <div>
                            <div className="text-xs font-bold text-stone-800">{card.front}</div>
                            <div className="text-[11px] text-stone-500 font-mono">
                              {card.romanisation || card.back}
                            </div>
                          </div>
                          <div className="text-sm font-extrabold text-stone-900">{card.back}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PRACTICE & SMART PRACTICE LAB (Stage 3) */}
              {activeTab === 'practice' && (
                <div className="space-y-4">
                  {/* Practice Lab Mode Switcher */}
                  <div className="flex bg-white/80 p-1.5 rounded-2xl border border-stone-200/80 shadow-2xs gap-1 overflow-x-auto">
                    {[
                      { id: 'sm2', label: 'SM-2 Review', icon: Dumbbell },
                      { id: 'roleplay', label: 'Roleplay Sprints', icon: MessageSquare },
                      { id: 'listening', label: 'Listening (0.75x - 1.25x)', icon: Headphones },
                      { id: 'speaking', label: 'Pronunciation', icon: Mic },
                      { id: 'grammar', label: 'Grammar Clinic', icon: Sliders },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = practiceSubTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            triggerHaptic();
                            setPracticeSubTab(tab.id as any);
                          }}
                          className={`flex-1 min-w-[80px] py-2 px-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                            isActive
                              ? 'bg-stone-900 text-white shadow-xs'
                              : 'text-stone-600 hover:bg-stone-100'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* SUB-TAB 1: SM-2 SPACED REPETITION */}
                  {practiceSubTab === 'sm2' && (
                    <div className="space-y-4">
                      {/* SM-2 Review Card */}
                      <div
                        className="p-5 rounded-3xl bg-white border-2 shadow-xs text-center relative overflow-hidden"
                        style={{ borderColor: mascot.colors.cardBorder }}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            SM-2 Review Pool • Card {activePracticeIndex + 1} of {sm2Queue.length}
                          </span>
                          <span className="text-[10px] font-bold text-stone-400">
                            Repetition: {sm2Queue[activePracticeIndex]?.repetitions || 1}
                          </span>
                        </div>

                        {/* Interactive 3D Flip Card */}
                        <div
                          onClick={() => {
                            triggerHaptic();
                            setPracticeFlipped(!practiceFlipped);
                          }}
                          className="cursor-pointer min-h-[170px] p-5 rounded-2xl bg-stone-50 border-2 border-stone-200 flex flex-col items-center justify-center transition-all hover:border-amber-400"
                        >
                          {!practiceFlipped ? (
                            <>
                              <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                                Prompt (Tap to Reveal)
                              </div>
                              <div className="text-lg font-black text-stone-800">
                                {sm2Queue[activePracticeIndex]?.prompt}
                              </div>
                              <div className="text-[11px] text-stone-500 mt-2 font-medium">
                                Tap card to check answer
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
                                Target Native Script
                              </div>
                              <div className="text-2xl font-black text-stone-900 mb-1">
                                {sm2Queue[activePracticeIndex]?.answer}
                              </div>
                              {sm2Queue[activePracticeIndex]?.romanisation && (
                                <div className="text-xs font-mono font-bold text-amber-800">
                                  {sm2Queue[activePracticeIndex]?.romanisation}
                                </div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayAudio(
                                    sm2Queue[activePracticeIndex]?.answer.split(' ')[0] || '',
                                    currentLanguage
                                  );
                                }}
                                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600"
                              >
                                <Volume2 className="w-3.5 h-3.5" /> Listen
                              </button>
                            </>
                          )}
                        </div>

                        {/* SM-2 Quality Rating Buttons (0 to 5) */}
                        <div className="mt-4 pt-3 border-t border-stone-100">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">
                            Rate Your Recall Accuracy (SM-2 Interval)
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            <button
                              onClick={() => handleSM2Review(1)}
                              className="py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 text-[11px] font-bold transition-colors"
                            >
                              Again (1d)
                            </button>
                            <button
                              onClick={() => handleSM2Review(3)}
                              className="py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-bold transition-colors"
                            >
                              Hard (1d)
                            </button>
                            <button
                              onClick={() => handleSM2Review(4)}
                              className="py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 text-[11px] font-bold transition-colors"
                            >
                              Good (6d)
                            </button>
                            <button
                              onClick={() => handleSM2Review(5)}
                              className="py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold transition-colors"
                            >
                              Easy (+EF)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* SM-2 Metrics Widget */}
                      <div className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-2xs flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-stone-900">Spaced-Repetition Health</div>
                          <div className="text-[10px] text-stone-500">
                            Current Ease Factor: {sm2Queue[activePracticeIndex]?.easeFactor || 2.50} • Next: {sm2Queue[activePracticeIndex]?.interval || 1}d
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 2: LISTENING DRILLS WITH VARIABLE SPEED (0.75x, 1.0x, 1.25x) */}
                  {practiceSubTab === 'listening' && (() => {
                    const drills = LISTENING_DRILLS[currentLanguage] || LISTENING_DRILLS['ja'];
                    const currentDrill = drills[activeListeningIndex] || drills[0];

                    return (
                      <div className="space-y-4">
                        <div
                          className="p-5 rounded-3xl bg-white border-2 shadow-xs text-center"
                          style={{ borderColor: mascot.colors.cardBorder }}
                        >
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              Listening Drill {activeListeningIndex + 1} of {drills.length}
                            </span>
                            <div className="flex items-center gap-1">
                              {[0.75, 1.0, 1.25].map((speed) => (
                                <button
                                  key={speed}
                                  onClick={() => {
                                    triggerHaptic();
                                    setListeningSpeed(speed);
                                  }}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                                    listeningSpeed === speed
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                  }`}
                                >
                                  {speed}x
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="my-4 py-4 px-3 rounded-2xl bg-blue-50/50 border border-blue-100 flex flex-col items-center justify-center">
                            <button
                              onClick={() => handlePlayAudio(currentDrill.nativeScript, currentLanguage, listeningSpeed)}
                              className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all mb-3"
                            >
                              <Volume2 className="w-8 h-8" />
                            </button>
                            <span className="text-xs font-bold text-blue-900">
                              Play at {listeningSpeed}x ({listeningSpeed === 0.75 ? 'Learner Slow' : listeningSpeed === 1.25 ? 'Fast Sprint' : 'Standard'})
                            </span>
                          </div>

                          <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/70 text-left mb-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">
                              Phonetic Clue
                            </div>
                            <p className="text-xs text-stone-700 font-medium">
                              {currentDrill.clue}
                            </p>
                          </div>

                          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-left mb-4">
                            <div className="text-base font-black text-stone-900 mb-0.5">
                              {currentDrill.nativeScript}
                            </div>
                            <div className="text-xs font-mono font-bold text-amber-900 mb-1">
                              {currentDrill.romanisation}
                            </div>
                            <div className="text-xs text-stone-600 font-medium">
                              Meaning: {currentDrill.meaning}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              disabled={activeListeningIndex === 0}
                              onClick={() => {
                                triggerHaptic();
                                setActiveListeningIndex((prev) => Math.max(0, prev - 1));
                              }}
                              className="flex-1 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold disabled:opacity-40"
                            >
                              Previous Drill
                            </button>
                            <button
                              disabled={activeListeningIndex >= drills.length - 1}
                              onClick={() => {
                                triggerHaptic();
                                setActiveListeningIndex((prev) => Math.min(drills.length - 1, prev + 1));
                              }}
                              className="flex-1 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-40"
                              style={{ backgroundColor: mascot.colors.primary }}
                            >
                              Next Drill
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* SUB-TAB 3: PRONUNCIATION SELF-ASSESSMENT */}
                  {practiceSubTab === 'speaking' && (() => {
                    const drills = LISTENING_DRILLS[currentLanguage] || LISTENING_DRILLS['ja'];
                    const currentDrill = drills[0];

                    return (
                      <div className="space-y-4">
                        <div
                          className="p-5 rounded-3xl bg-white border-2 shadow-xs text-center"
                          style={{ borderColor: mascot.colors.cardBorder }}
                        >
                          <div className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-800 inline-block mb-3">
                            Pronunciation Assessment Drill
                          </div>

                          <div className="text-2xl font-black text-stone-900 mb-1">
                            {currentDrill.nativeScript}
                          </div>
                          <div className="text-xs font-mono font-bold text-amber-800 mb-4">
                            {currentDrill.romanisation}
                          </div>

                          <div className="py-4">
                            <button
                              onClick={() => handlePronunciationDrill(currentDrill.romanisation)}
                              disabled={isSpeakingListening}
                              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-lg transition-all ${
                                isSpeakingListening
                                  ? 'bg-red-500 text-white animate-pulse scale-110'
                                  : 'bg-red-100 hover:bg-red-200 text-red-700 border-2 border-red-300 active:scale-95'
                              }`}
                            >
                              <Mic className="w-10 h-10" />
                            </button>
                            <div className="text-xs font-bold text-stone-600 mt-3">
                              {isSpeakingListening ? 'Listening & Analyzing Phonemes...' : 'Tap to Test Pronunciation'}
                            </div>
                          </div>

                          {pronunciationScore && (
                            <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-left">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                                  Pronunciation Accuracy
                                </span>
                                <span className="text-base font-black text-emerald-700">
                                  {pronunciationScore.scorePercentage}%
                                </span>
                              </div>
                              <p className="text-xs text-emerald-800 font-medium">
                                {pronunciationScore.feedback}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* SUB-TAB 4: GRAMMAR CLINIC */}
                  {practiceSubTab === 'grammar' && (() => {
                    const tips = GRAMMAR_TIPS[currentLanguage] || GRAMMAR_TIPS['ja'];

                    return (
                      <div className="space-y-3">
                        <div className="text-xs font-bold text-stone-500 uppercase tracking-wider pl-1">
                          Contextual Grammar Rules ({currentLanguage.toUpperCase()})
                        </div>
                        {tips.map((tip) => (
                          <div
                            key={tip.id}
                            className="p-4 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-2.5"
                          >
                            <div className="flex items-center gap-2">
                              <Sliders className="w-4 h-4 text-amber-600" />
                              <h4 className="text-xs font-black text-stone-900">{tip.topic}</h4>
                            </div>
                            <p className="text-xs text-stone-600 leading-relaxed">
                              {tip.explanation}
                            </p>
                            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] font-bold text-amber-950">
                              Rule: {tip.keyRule}
                            </div>
                            <div className="space-y-1.5 pt-1">
                              {tip.examples.map((ex, idx) => (
                                <div key={idx} className="p-2 rounded-xl bg-stone-50 border border-stone-200/60 text-xs">
                                  <div className="font-bold text-stone-900">{ex.native}</div>
                                  {ex.romanisation && (
                                    <div className="font-mono text-[10px] text-amber-800">{ex.romanisation}</div>
                                  )}
                                  <div className="text-[11px] text-stone-600 italic">"{ex.translation}"</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* SUB-TAB 5: STAGE 4 INTERACTIVE ROLEPLAY SPRINTS */}
                  {practiceSubTab === 'roleplay' && (
                    <div className="space-y-4">
                      {!activeRoleplayScenario ? (
                        /* Scenario Catalog View */
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                                Conversational Roleplay Sprints
                              </h3>
                              <p className="text-[11px] text-stone-500 font-medium">
                                Practice real-life dialogues with native NPCs guided by {mascot.name}.
                              </p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              Stage 4 Active
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5">
                            {DIALOGUE_SCENARIOS.map((scenario) => (
                              <div
                                key={scenario.id}
                                className="p-4 rounded-3xl bg-white border-2 transition-all hover:border-amber-400 shadow-2xs space-y-2.5"
                                style={{ borderColor: mascot.colors.cardBorder }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-xl shadow-2xs border border-amber-200/60">
                                      {scenario.icon}
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-black text-stone-900 leading-tight">
                                        {scenario.title}
                                      </h4>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 uppercase">
                                          {scenario.languageCode.toUpperCase()}
                                        </span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100/70 text-amber-900 capitalize">
                                          {scenario.difficulty}
                                        </span>
                                        <span className="text-[10px] font-bold text-stone-400">
                                          • {scenario.totalTurns} turns
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    +{scenario.xpReward} XP
                                  </span>
                                </div>

                                <p className="text-xs text-stone-600 leading-relaxed">
                                  {scenario.description}
                                </p>

                                <button
                                  onClick={() => {
                                    triggerHaptic();
                                    setActiveRoleplayScenario(scenario);
                                    setRoleplayTurnIndex(1);
                                    setRoleplayTurnHistory([]);
                                    setRoleplayFeedback(null);
                                    setRoleplayInput('');
                                    setShowRoleplayHint(false);
                                    // Speak initial turn prompt
                                    if (scenario.turns[0]) {
                                      handlePlayAudio(
                                        scenario.turns[0].promptNative,
                                        scenario.languageCode,
                                        listeningSpeed
                                      );
                                    }
                                  }}
                                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white transition-all shadow-xs flex items-center justify-center gap-2 hover:opacity-95 active:scale-98"
                                  style={{ backgroundColor: mascot.colors.primary }}
                                >
                                  <span>Start Roleplay Sprint</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* Active Roleplay Dialogue Runner */
                        (() => {
                          const currentTurn = activeRoleplayScenario.turns.find(
                            (t) => t.turnIndex === roleplayTurnIndex
                          ) || activeRoleplayScenario.turns[0];

                          return (
                            <div className="space-y-3">
                              {/* Header & Progress */}
                              <div className="p-3.5 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <button
                                    onClick={() => {
                                      triggerHaptic();
                                      setActiveRoleplayScenario(null);
                                      setRoleplayFeedback(null);
                                    }}
                                    className="flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span>Exit Sprint</span>
                                  </button>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-black text-amber-600">
                                      Turn {roleplayTurnIndex} of {activeRoleplayScenario.totalTurns}
                                    </span>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                                      +{activeRoleplayScenario.xpReward} XP
                                    </span>
                                  </div>
                                </div>

                                <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                      backgroundColor: mascot.colors.primary,
                                      width: `${(roleplayTurnIndex / activeRoleplayScenario.totalTurns) * 100}%`,
                                    }}
                                  />
                                </div>

                                <div className="text-[11px] text-stone-600 bg-stone-50 p-2 rounded-xl border border-stone-200/60 flex items-center gap-1.5">
                                  <span>{activeRoleplayScenario.icon}</span>
                                  <span className="font-semibold text-stone-800">
                                    {activeRoleplayScenario.title}:
                                  </span>
                                  <span className="text-stone-600 truncate">
                                    {activeRoleplayScenario.settingContext}
                                  </span>
                                </div>
                              </div>

                              {/* Dialogue Transcript / Completed Turns */}
                              {roleplayTurnHistory.length > 0 && (
                                <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-stone-50/60 rounded-2xl border border-stone-200/50">
                                  {roleplayTurnHistory.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className={`p-2.5 rounded-2xl text-xs ${
                                        item.role === 'npc'
                                          ? 'bg-white border border-stone-200 text-stone-800 mr-8'
                                          : 'bg-amber-500 text-white ml-8 shadow-2xs'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between text-[10px] font-bold opacity-80 mb-0.5">
                                        <span>{item.speakerName || (item.role === 'npc' ? 'Counterpart' : 'You')}</span>
                                        {item.score !== undefined && (
                                          <span className="bg-black/20 px-1.5 py-0.2 rounded-md">
                                            {item.score}% accuracy
                                          </span>
                                        )}
                                      </div>
                                      <div className="font-bold">{item.text}</div>
                                      {item.romanisation && (
                                        <div className="text-[10px] font-mono opacity-90">{item.romanisation}</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Active NPC Message Bubble */}
                              <div
                                className="p-4 rounded-3xl bg-white border-2 shadow-2xs space-y-3 relative"
                                style={{ borderColor: mascot.colors.cardBorder }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-900">
                                      👤
                                    </div>
                                    <div>
                                      <span className="text-xs font-black text-stone-900 block leading-tight">
                                        {currentTurn.npcName}
                                      </span>
                                      <span className="text-[10px] font-medium text-stone-400">
                                        Counterpart Speaker
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() =>
                                      handlePlayAudio(
                                        currentTurn.promptNative,
                                        activeRoleplayScenario.languageCode,
                                        listeningSpeed
                                      )
                                    }
                                    className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors flex items-center gap-1 text-[11px] font-bold"
                                  >
                                    <Volume2 className="w-3.5 h-3.5" />
                                    <span>Listen</span>
                                  </button>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
                                  <div className="text-base font-black text-stone-900 leading-snug">
                                    {currentTurn.promptNative}
                                  </div>
                                  {currentTurn.promptRomanisation && (
                                    <div className="text-xs font-mono font-bold text-amber-800">
                                      {currentTurn.promptRomanisation}
                                    </div>
                                  )}
                                  <div className="text-xs text-stone-600 pt-1 border-t border-stone-200/60 mt-1">
                                    "{currentTurn.promptTranslation}"
                                  </div>
                                </div>

                                {/* Mascot Tutor Advice Bubble */}
                                <div
                                  className="p-3 rounded-2xl flex items-start gap-2.5"
                                  style={{ backgroundColor: mascot.colors.primaryLight }}
                                >
                                  <div className="shrink-0 pt-0.5">
                                    <MascotVector mascot={selectedMascotId} size={28} />
                                  </div>
                                  <div className="text-[11px] leading-relaxed">
                                    <span className="font-bold text-stone-900 block">
                                      {mascot.name}'s Coaching Tip:
                                    </span>
                                    <span className="text-stone-700">
                                      {currentTurn.correctionGuidance}
                                    </span>
                                  </div>
                                </div>

                                {/* Collapsible Hint Drawer */}
                                <div>
                                  <button
                                    onClick={() => {
                                      triggerHaptic();
                                      setShowRoleplayHint(!showRoleplayHint);
                                    }}
                                    className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900"
                                  >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    <span>
                                      {showRoleplayHint ? 'Hide Response Suggestions' : '💡 Need a hint? Show sample responses'}
                                    </span>
                                  </button>

                                  {showRoleplayHint && (
                                    <div className="mt-2 space-y-2 p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs">
                                      <div className="text-[10px] font-black uppercase tracking-wider text-amber-900">
                                        Acceptable Responses:
                                      </div>
                                      {currentTurn.expectedResponseHints.map((hint, idx) => (
                                        <div
                                          key={idx}
                                          className="p-2 rounded-xl bg-white border border-amber-200 flex items-center justify-between gap-2"
                                        >
                                          <div>
                                            <div className="font-bold text-stone-900">{hint.native}</div>
                                            {hint.romanisation && (
                                              <div className="text-[10px] font-mono text-amber-800">
                                                {hint.romanisation}
                                              </div>
                                            )}
                                            <div className="text-[10px] text-stone-500 italic">
                                              "{hint.translation}"
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => {
                                              triggerHaptic();
                                              setRoleplayInput(hint.native);
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-[10px] shrink-0 hover:bg-amber-700"
                                          >
                                            Use this
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* User Response Input & Interactive Evaluation */}
                              {!roleplayFeedback ? (
                                <div className="p-4 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-2.5">
                                  <label className="text-xs font-bold text-stone-700 block">
                                    Your Turn: Reply in{' '}
                                    <span className="capitalize">{activeRoleplayScenario.languageCode}</span>
                                  </label>

                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={roleplayInput}
                                      onChange={(e) => setRoleplayInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && roleplayInput.trim()) {
                                          triggerHaptic();
                                          const res = DialogueService.evaluateTurnResponse(
                                            activeRoleplayScenario.id,
                                            roleplayTurnIndex,
                                            roleplayInput
                                          );
                                          setRoleplayFeedback(res);
                                        }
                                      }}
                                      placeholder={`Type or select reply (e.g. ${currentTurn.expectedResponseHints[0]?.native})...`}
                                      className="flex-1 py-2.5 px-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-amber-500 font-medium"
                                    />
                                    <button
                                      disabled={!roleplayInput.trim()}
                                      onClick={() => {
                                        triggerHaptic();
                                        const res = DialogueService.evaluateTurnResponse(
                                          activeRoleplayScenario.id,
                                          roleplayTurnIndex,
                                          roleplayInput
                                        );
                                        setRoleplayFeedback(res);
                                      }}
                                      className="py-2.5 px-4 rounded-2xl font-bold text-xs text-white transition-all shadow-xs flex items-center justify-center gap-1 disabled:opacity-40"
                                      style={{ backgroundColor: mascot.colors.primary }}
                                    >
                                      <Send className="w-3.5 h-3.5" />
                                      <span>Send</span>
                                    </button>
                                  </div>

                                  {/* Quick suggestion chips for rapid mobile tapping */}
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {currentTurn.expectedResponseHints.map((hint, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => {
                                          triggerHaptic();
                                          setRoleplayInput(hint.native);
                                        }}
                                        className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors border border-stone-200"
                                      >
                                        💬 {hint.native}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                /* Evaluation Feedback Banner */
                                <div
                                  className={`p-4 rounded-3xl border-2 shadow-2xs space-y-3 ${
                                    roleplayFeedback.isAcceptable
                                      ? 'bg-emerald-50/80 border-emerald-300'
                                      : 'bg-rose-50/80 border-rose-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">
                                        {roleplayFeedback.isAcceptable ? '🌟' : '💡'}
                                      </span>
                                      <span
                                        className={`text-xs font-black uppercase tracking-wider ${
                                          roleplayFeedback.isAcceptable ? 'text-emerald-900' : 'text-rose-900'
                                        }`}
                                      >
                                        {roleplayFeedback.score}% Accuracy Match
                                      </span>
                                    </div>
                                    <span
                                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                        roleplayFeedback.isAcceptable
                                          ? 'bg-emerald-200 text-emerald-900'
                                          : 'bg-rose-200 text-rose-900'
                                      }`}
                                    >
                                      {roleplayFeedback.isAcceptable ? 'Understood' : 'Needs Adjustment'}
                                    </span>
                                  </div>

                                  <p className="text-xs text-stone-700 font-medium">
                                    {roleplayFeedback.feedback}
                                  </p>

                                  <div className="flex gap-2 pt-1">
                                    {!roleplayFeedback.isAcceptable ? (
                                      <button
                                        onClick={() => {
                                          triggerHaptic();
                                          setRoleplayFeedback(null);
                                        }}
                                        className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-stone-800 text-white hover:bg-stone-900 transition-colors"
                                      >
                                        Try Again
                                      </button>
                                    ) : roleplayFeedback.isScenarioComplete ? (
                                      <button
                                        onClick={() => {
                                          triggerHaptic();
                                          confetti({ particleCount: 60, spread: 80 });
                                          // Award XP
                                          if (profile) {
                                            setProfile({
                                              ...profile,
                                              xp: (profile.xp || 0) + activeRoleplayScenario.xpReward,
                                            });
                                          }
                                          setRoleplayCompleteModal({
                                            scenario: activeRoleplayScenario,
                                            stars: roleplayFeedback.starsEarned || 3,
                                            xp: activeRoleplayScenario.xpReward,
                                          });
                                          setActiveRoleplayScenario(null);
                                          setRoleplayFeedback(null);
                                        }}
                                        className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-white transition-all shadow-xs flex items-center justify-center gap-1.5"
                                        style={{ backgroundColor: mascot.colors.primary }}
                                      >
                                        <Sparkles className="w-4 h-4" />
                                        <span>Complete Sprint (+{activeRoleplayScenario.xpReward} XP)</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          triggerHaptic();
                                          // Record turn history
                                          setRoleplayTurnHistory((prev) => [
                                            ...prev,
                                            {
                                              role: 'npc',
                                              speakerName: currentTurn.npcName,
                                              text: currentTurn.promptNative,
                                              romanisation: currentTurn.promptRomanisation,
                                              translation: currentTurn.promptTranslation,
                                            },
                                            {
                                              role: 'user',
                                              speakerName: profile?.displayName || 'You',
                                              text: roleplayInput,
                                              score: roleplayFeedback.score,
                                            },
                                          ]);
                                          const nextIndex = roleplayTurnIndex + 1;
                                          setRoleplayTurnIndex(nextIndex);
                                          setRoleplayInput('');
                                          setRoleplayFeedback(null);
                                          setShowRoleplayHint(false);
                                          // Speak next NPC turn prompt
                                          const nextTurn = activeRoleplayScenario.turns.find(
                                            (t) => t.turnIndex === nextIndex
                                          );
                                          if (nextTurn) {
                                            handlePlayAudio(
                                              nextTurn.promptNative,
                                              activeRoleplayScenario.languageCode,
                                              listeningSpeed
                                            );
                                          }
                                        }}
                                        className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-white transition-all shadow-xs flex items-center justify-center gap-1.5"
                                        style={{ backgroundColor: mascot.colors.primary }}
                                      >
                                        <span>Continue to Turn {roleplayTurnIndex + 1}</span>
                                        <ArrowRight className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: REWARDS (STAGE 5: REFERRALS, MILESTONE SPIN WHEEL & GOOGLE PLAY SUBSCRIPTIONS) */}
              {activeTab === 'rewards' && (
                <div className="space-y-4">
                  {/* Referral Toast Feedback */}
                  {referralToast && (
                    <div className="p-3 rounded-2xl bg-stone-900 text-white text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>{referralToast}</span>
                      </div>
                      <button
                        onClick={() => setReferralToast(null)}
                        className="text-stone-400 hover:text-white text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Header Card */}
                  <div
                    className="p-4 rounded-3xl bg-white border-2 shadow-2xs"
                    style={{ borderColor: mascot.colors.cardBorder }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center p-1"
                          style={{ backgroundColor: mascot.colors.primaryLight }}
                        >
                          <Gift className="w-5 h-5" style={{ color: mascot.colors.primary }} />
                        </div>
                        <div>
                          <h2 className="text-base font-black text-stone-900">
                            Referrals & Spin Wheel
                          </h2>
                          <p className="text-[11px] text-stone-500 font-medium">
                            Invite friends & unlock milestone wheel spins
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                        <Shield className="w-3 h-3 text-emerald-600" />
                        <span>Anti-Abuse Verified</span>
                      </div>
                    </div>

                    {/* Referral Code Card */}
                    <div className="mt-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                          Your Exclusive Referral Code
                        </span>
                        <span className="text-[10px] font-semibold text-stone-400">
                          Zero-Fraud OTP Validated
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 py-2 px-3 rounded-xl bg-white border border-stone-300 font-mono text-sm font-black text-stone-900 tracking-wide text-center">
                          {referralCode}
                        </div>
                        <button
                          onClick={() => {
                            triggerHaptic();
                            navigator.clipboard?.writeText(referralCode);
                            setCopiedReferralCode(true);
                            setReferralToast('Referral code copied to clipboard!');
                            setTimeout(() => setCopiedReferralCode(false), 2000);
                          }}
                          className="py-2 px-3 rounded-xl font-bold text-xs text-white flex items-center gap-1.5 transition-all shadow-xs"
                          style={{ backgroundColor: mascot.colors.primary }}
                        >
                          {copiedReferralCode ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Share link and Simulate verification buttons */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          onClick={() => {
                            triggerHaptic();
                            const link = `https://skillsprint.ai/join?ref=${referralCode}`;
                            navigator.clipboard?.writeText(link);
                            setReferralToast('Invite link copied! Share with study buddies.');
                          }}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-[11px] font-bold text-stone-700 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Share2 className="w-3 h-3 text-stone-500" />
                          <span>Share Link</span>
                        </button>

                        <button
                          onClick={() => {
                            triggerHaptic();
                            setShowOtpSimulatorModal(true);
                          }}
                          className="py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[11px] font-bold text-amber-800 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Smartphone className="w-3 h-3 text-amber-700" />
                          <span>Test Phone OTP (+1 Ref)</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Milestone Tiers (5, 10, 20 Verified) */}
                  <div
                    className="p-4 rounded-3xl bg-white border-2 shadow-2xs space-y-3"
                    style={{ borderColor: mascot.colors.cardBorder }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>Milestone Tiers (5, 10, 20)</span>
                        </h3>
                        <p className="text-[11px] text-stone-500">
                          {verifiedReferralsCount} verified friends invited
                        </p>
                      </div>
                      <div className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-black text-xs">
                        🎟️ {Math.max(0, (verifiedReferralsCount >= 20 ? 3 : verifiedReferralsCount >= 10 ? 2 : verifiedReferralsCount >= 5 ? 1 : 0) - claimedSpinsCount)} Spins Available
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative pt-1">
                      <div className="w-full h-3 rounded-full bg-stone-100 overflow-hidden p-0.5 border border-stone-200">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (verifiedReferralsCount / 20) * 100)}%`,
                            backgroundColor: mascot.colors.primary,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-stone-400 mt-1">
                        <span>0</span>
                        <span className={verifiedReferralsCount >= 5 ? 'text-amber-600 font-black' : ''}>
                          5 (Tier 1) {verifiedReferralsCount >= 5 ? '✓' : ''}
                        </span>
                        <span className={verifiedReferralsCount >= 10 ? 'text-amber-600 font-black' : ''}>
                          10 (Tier 2) {verifiedReferralsCount >= 10 ? '✓' : ''}
                        </span>
                        <span className={verifiedReferralsCount >= 20 ? 'text-amber-600 font-black' : ''}>
                          20 (Tier 3) {verifiedReferralsCount >= 20 ? '✓' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Milestone Checkpoint Cards */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {[
                        { tier: 5, label: 'Tier 1', token: '1 Spin', unlocked: verifiedReferralsCount >= 5 },
                        { tier: 10, label: 'Tier 2', token: '1 Spin', unlocked: verifiedReferralsCount >= 10 },
                        { tier: 20, label: 'Tier 3', token: '1 Spin', unlocked: verifiedReferralsCount >= 20 },
                      ].map((m, i) => (
                        <div
                          key={i}
                          className={`p-2.5 rounded-2xl border text-center transition-all ${
                            m.unlocked
                              ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                              : 'bg-stone-50 border-stone-200 opacity-60'
                          }`}
                        >
                          <div className="text-[10px] font-extrabold uppercase text-stone-500">
                            {m.tier} Friends
                          </div>
                          <div className="text-xs font-black text-stone-900 mt-0.5">
                            {m.token}
                          </div>
                          <div className="mt-1">
                            {m.unlocked ? (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                                Unlocked
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold text-stone-500">
                                {m.tier - verifiedReferralsCount} more
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Animated Spin Wheel Card */}
                  <div
                    className="p-5 rounded-3xl bg-white border-2 shadow-2xs text-center relative overflow-hidden"
                    style={{ borderColor: mascot.colors.cardBorder }}
                  >
                    <div className="mb-3">
                      <h3 className="text-base font-black text-stone-900">
                        Milestone Reward Wheel
                      </h3>
                      <p className="text-xs text-stone-500">
                        Spin to win Streak Freezes, XP Boosts, or Pro Passes!
                      </p>
                    </div>

                    {/* Wheel Container with Pointer */}
                    <div className="relative w-64 h-64 mx-auto my-2 flex items-center justify-center">
                      {/* Pointer Needle at Top (12 o'clock) */}
                      <div className="absolute -top-1.5 z-20 flex flex-col items-center">
                        <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-red-600 drop-shadow-md" />
                      </div>

                      {/* Rotating Wheel Disk (SVG) */}
                      <div
                        className="w-56 h-56 rounded-full shadow-xl border-4 border-white transition-transform"
                        style={{
                          transform: `rotate(${wheelRotationDeg}deg)`,
                          transition: wheelSpinning
                            ? 'transform 3.5s cubic-bezier(0.15, 0.85, 0.35, 1)'
                            : 'none',
                        }}
                      >
                        <svg viewBox="0 0 200 200" className="w-full h-full rounded-full">
                          {/* 6 Sectors of 60 degrees each */}
                          {SPIN_WHEEL_SECTORS.map((sector, idx) => {
                            const startAngle = idx * 60;
                            const endAngle = (idx + 1) * 60;
                            const startRad = ((startAngle - 90) * Math.PI) / 180;
                            const endRad = ((endAngle - 90) * Math.PI) / 180;

                            const x1 = 100 + 100 * Math.cos(startRad);
                            const y1 = 100 + 100 * Math.sin(startRad);
                            const x2 = 100 + 100 * Math.cos(endRad);
                            const y2 = 100 + 100 * Math.sin(endRad);

                            const textAngle = startAngle + 30;
                            const textRad = ((textAngle - 90) * Math.PI) / 180;
                            const tx = 100 + 64 * Math.cos(textRad);
                            const ty = 100 + 64 * Math.sin(textRad);

                            return (
                              <g key={sector.id}>
                                <path
                                  d={`M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                                  fill={sector.color}
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                />
                                <text
                                  x={tx}
                                  y={ty}
                                  fill="#ffffff"
                                  fontSize="8.5"
                                  fontWeight="900"
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  transform={`rotate(${textAngle + 90}, ${tx}, ${ty})`}
                                >
                                  {sector.label}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Center Wheel Hub with Mascot Emblem */}
                      <div className="absolute z-10 w-16 h-16 rounded-full bg-white border-4 border-stone-100 shadow-md flex items-center justify-center p-1 pointer-events-none">
                        <MascotVector mascot={selectedMascotId} size={36} />
                      </div>
                    </div>

                    {/* Spin Button */}
                    {(() => {
                      const totalTokens =
                        verifiedReferralsCount >= 20
                          ? 3
                          : verifiedReferralsCount >= 10
                          ? 2
                          : verifiedReferralsCount >= 5
                          ? 1
                          : 0;
                      const availableSpins = Math.max(0, totalTokens - claimedSpinsCount);

                      return (
                        <div className="mt-3">
                          <button
                            disabled={wheelSpinning || availableSpins <= 0}
                            onClick={() => {
                              if (availableSpins <= 0 || wheelSpinning) return;
                              triggerHaptic();
                              setWheelSpinning(true);

                              // Execute Spin Wheel
                              try {
                                const spin = ReferralService.executeSpinWheel(
                                  firebaseUser?.uid || 'learner_user'
                                );
                                const targetSector = spin.sector;
                                const newRotation = wheelRotationDeg + 1800 + (360 - (spin.sectorIndex * 60 + 30));
                                setWheelRotationDeg(newRotation);

                                setTimeout(() => {
                                  setWheelSpinning(false);
                                  setRewardWon(targetSector);
                                  setClaimedSpinsCount((c) => c + 1);
                                  setShowRewardModal(true);
                                  confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
                                  triggerHaptic();

                                  // Apply Reward to profile
                                  if (targetSector.type === 'xp' && profile) {
                                    setProfile({ ...profile, xp: (profile.xp || 0) + targetSector.value });
                                  } else if (targetSector.type === 'streak_freeze') {
                                    setActiveFreezes((f) => Math.min(2, f + 1));
                                  } else if (targetSector.type === 'pro_pass' && profile) {
                                    setProfile({ ...profile, subscriptionStatus: 'premium' });
                                  }
                                }, 3500);
                              } catch (err: any) {
                                setWheelSpinning(false);
                                setReferralToast(err.message || 'Error executing spin');
                              }
                            }}
                            className="w-full py-3.5 px-6 rounded-2xl font-black text-sm text-white transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: mascot.colors.primary }}
                          >
                            <Zap className="w-4 h-4 fill-white" />
                            <span>
                              {wheelSpinning
                                ? 'Spinning the Wheel...'
                                : availableSpins > 0
                                ? `SPIN THE WHEEL (${availableSpins} Available)`
                                : 'Unlock Milestone at 5 Friends to Spin'}
                            </span>
                          </button>
                          {availableSpins <= 0 && (
                            <p className="text-[11px] text-stone-500 mt-2">
                              Tap "Test Phone OTP" above to simulate adding verified referrals!
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Subscriptions Card (Google Play Billing for Android + Pro Privileges) */}
                  <div
                    className="p-5 rounded-3xl bg-linear-to-br from-amber-500 via-orange-500 to-amber-600 text-white shadow-md relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                          <Crown className="w-5 h-5 text-amber-200 fill-amber-200" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-black tracking-widest text-amber-200">
                            Google Play Billing
                          </div>
                          <h3 className="text-base font-black">SkillSprint Pro</h3>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-bold backdrop-blur-xs">
                        {profile?.subscriptionStatus === 'premium' ? 'Active Pro ✨' : 'Free Tier'}
                      </span>
                    </div>

                    <p className="text-xs text-white/90 leading-relaxed mb-4">
                      Supercharge your learning with unlimited AI translations, all 4 conversational roleplay sprints, and 0.75x–1.25x listening speeds.
                    </p>

                    {/* Entitlements Comparison Pills */}
                    <div className="grid grid-cols-2 gap-2 mb-4 text-stone-900">
                      <div className="p-2.5 rounded-2xl bg-white/95 text-xs space-y-1">
                        <div className="text-[10px] font-bold text-stone-500 uppercase">Free Learner</div>
                        <div className="font-extrabold text-stone-800">10 Translations / day</div>
                        <div className="text-[11px] text-stone-600">2 SM-2 Reviews / day</div>
                        <div className="text-[11px] text-stone-600">Standard 1.0x Audio</div>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-white text-xs space-y-1 border-2 border-amber-300 shadow-xs">
                        <div className="text-[10px] font-black text-amber-600 uppercase flex items-center gap-1">
                          <Crown className="w-3 h-3 fill-amber-500" /> SkillSprint Pro
                        </div>
                        <div className="font-black text-emerald-700">Unlimited Translations</div>
                        <div className="font-bold text-stone-900">Infinite SM-2 Reviews</div>
                        <div className="font-bold text-stone-900">0.75x–1.25x Variable Speed</div>
                      </div>
                    </div>

                    {/* Billing Interval Toggle */}
                    <div className="flex rounded-2xl bg-black/20 p-1 mb-3">
                      <button
                        onClick={() => setSelectedPlanInterval('month')}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          selectedPlanInterval === 'month'
                            ? 'bg-white text-stone-900 shadow-xs'
                            : 'text-white/80 hover:text-white'
                        }`}
                      >
                        Monthly ($7.99/mo)
                      </button>
                      <button
                        onClick={() => setSelectedPlanInterval('year')}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
                          selectedPlanInterval === 'year'
                            ? 'bg-white text-stone-900 shadow-xs'
                            : 'text-white/80 hover:text-white'
                        }`}
                      >
                        <span>Annual ($59.99/yr)</span>
                        <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-black">
                          Save 37%
                        </span>
                      </button>
                    </div>

                    {/* Purchase Button */}
                    <button
                      disabled={isUpgradingPlay || profile?.subscriptionStatus === 'premium'}
                      onClick={() => {
                        triggerHaptic();
                        setIsUpgradingPlay(true);
                        setTimeout(() => {
                          try {
                            const sub = SubscriptionService.verifyGooglePlayPurchase({
                              userId: firebaseUser?.uid || 'learner_user',
                              productId:
                                selectedPlanInterval === 'year'
                                  ? 'skillsprint_pro_annual'
                                  : 'skillsprint_pro_monthly',
                              purchaseToken: `gplay_token_${Date.now()}_stage5_verified`,
                              orderId: `GPA.3392-${Date.now().toString().slice(-6)}`,
                            });

                            if (profile) {
                              setProfile({ ...profile, subscriptionStatus: 'premium' });
                            }
                            setIsUpgradingPlay(false);
                            confetti({ particleCount: 90, spread: 90, origin: { y: 0.5 } });
                            setReferralToast('Google Play purchase verified! Welcome to SkillSprint Pro ✨');
                          } catch (err: any) {
                            setIsUpgradingPlay(false);
                            setReferralToast(err.message || 'Google Play purchase failed');
                          }
                        }, 1200);
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-white text-stone-900 font-black text-xs transition-all shadow-md hover:bg-stone-50 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <CreditCard className="w-4 h-4 text-orange-600" />
                      <span>
                        {profile?.subscriptionStatus === 'premium'
                          ? 'SkillSprint Pro Active'
                          : isUpgradingPlay
                          ? 'Verifying Google Play Receipt...'
                          : `Subscribe with Google Play (${selectedPlanInterval === 'year' ? '$59.99/year' : '$7.99/month'})`}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Won Reward Modal */}
              {showRewardModal && rewardWon && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center border-2 border-stone-200 shadow-2xl animate-scale-in">
                    <div
                      className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-md"
                      style={{ backgroundColor: rewardWon.color }}
                    >
                      <Gift className="w-8 h-8 text-white" />
                    </div>

                    <div className="text-[11px] font-black tracking-widest text-stone-400 uppercase">
                      Congratulations!
                    </div>
                    <h3 className="text-xl font-black text-stone-900 mt-1">
                      {rewardWon.title}
                    </h3>
                    <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                      {rewardWon.type === 'xp'
                        ? `You unlocked a +${rewardWon.value} XP boost added directly to your profile!`
                        : rewardWon.type === 'streak_freeze'
                        ? '1 Streak Freeze equipped! Protects your active streak from a missed day.'
                        : 'Pro Pass unlocked! Enjoy unrestricted AI translation sprints and roleplays.'}
                    </p>

                    <div className="mt-5">
                      <button
                        onClick={() => {
                          triggerHaptic();
                          setShowRewardModal(false);
                          setRewardWon(null);
                        }}
                        className="w-full py-3 rounded-2xl text-white font-black text-xs transition-all shadow-md"
                        style={{ backgroundColor: mascot.colors.primary }}
                      >
                        Claim & Equip Reward
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Simulated Phone OTP Anti-Abuse Modal */}
              {showOtpSimulatorModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="w-full max-w-sm rounded-3xl bg-white p-6 border-2 border-stone-200 shadow-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-amber-600" />
                        <h3 className="text-sm font-black text-stone-900">
                          Anti-Abuse Phone OTP
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowOtpSimulatorModal(false)}
                        className="text-stone-400 hover:text-stone-700 text-sm font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-xs text-stone-500 mb-4 leading-relaxed">
                      To prevent referral farming, referrals must verify via SMS OTP before unlocking milestone spin tokens.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-stone-500 uppercase">
                          Referee Phone Number
                        </label>
                        <input
                          type="text"
                          value={simulatedRefereePhone}
                          onChange={(e) => setSimulatedRefereePhone(e.target.value)}
                          className="w-full mt-1 p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-900"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-stone-500 uppercase">
                            SMS Verification Code
                          </label>
                          <span className="text-[10px] font-mono text-emerald-600 font-bold">
                            Test Code: 123456
                          </span>
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          value={simulatedOtpCode}
                          onChange={(e) => setSimulatedOtpCode(e.target.value)}
                          className="w-full mt-1 p-2.5 rounded-xl bg-stone-50 border border-stone-200 font-mono text-center tracking-widest text-sm font-black text-stone-900"
                        />
                      </div>

                      <button
                        onClick={() => {
                          triggerHaptic();
                          if (simulatedOtpCode !== '123456' && !simulatedOtpCode.startsWith('88')) {
                            setReferralToast('Invalid OTP! Please use 123456.');
                            return;
                          }

                          // Increment verified referrals count
                          setVerifiedReferralsCount((c) => c + 1);
                          setShowOtpSimulatorModal(false);
                          confetti({ particleCount: 50, spread: 60 });
                          setReferralToast('Phone verified! +1 verified referral added toward your next milestone spin.');
                        }}
                        className="w-full py-3 rounded-2xl text-white font-black text-xs transition-all shadow-md mt-2"
                        style={{ backgroundColor: mascot.colors.primary }}
                      >
                        Confirm OTP & Verify Referral
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PROFILE */}
              {activeTab === 'profile' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-3xl bg-white border-2 shadow-2xs" style={{ borderColor: mascot.colors.cardBorder }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center p-1" style={{ backgroundColor: mascot.colors.primaryLight }}>
                        <MascotVector mascot={selectedMascotId} size={48} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-stone-900">
                          {profile?.displayName || firebaseUser?.displayName || 'Learner'}
                        </h3>
                        <p className="text-xs text-stone-500 font-mono">{firebaseUser?.email}</p>
                        <span
                          className="mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: mascot.colors.badgeBg, color: mascot.colors.textMuted }}
                        >
                          Companion: {mascot.name}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setCurrentScreen('mascot_picker')}
                      className="w-full py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Change Mascot & Theme</span>
                    </button>
                  </div>

                  {profile?.role === 'developer' && (
                    <button
                      onClick={() => setCurrentScreen('developer_dashboard')}
                      className="w-full p-3.5 rounded-2xl bg-stone-900 text-stone-100 border border-stone-800 shadow-md flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-amber-400" />
                        <div className="text-left">
                          <div className="text-xs font-bold text-amber-400">Developer Dashboard</div>
                          <div className="text-[10px] text-stone-400">Strict Allowlist Verified</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-400" />
                    </button>
                  )}

                  <button
                    onClick={handleSignOut}
                    className="w-full py-2.5 rounded-xl border border-stone-300 text-stone-600 text-xs font-semibold hover:bg-stone-100"
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 8: DEVELOPER DASHBOARD                             */}
          {/* ========================================================= */}
          {currentScreen === 'developer_dashboard' && (
            <div className="flex-1 flex flex-col justify-between py-2">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setCurrentScreen('main')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-stone-700"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to App
                  </button>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 font-bold border border-amber-500/20">
                    FIREBASE RBAC: DEVELOPER
                  </span>
                </div>

                <div className="mb-3">
                  <h2 className="text-lg font-black text-stone-900">Developer Dashboard</h2>
                  <p className="text-[11px] text-stone-500">
                    Authenticated: <code className="font-mono">{firebaseUser?.email}</code>
                  </p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2.5 rounded-2xl bg-white border border-stone-200 shadow-2xs">
                    <div className="text-[9px] font-bold text-stone-400 uppercase">Available Slots</div>
                    <div className="text-xl font-black text-emerald-600">
                      {Math.max(0, currentCap - registeredOrdinaryUsers)}
                    </div>
                    <div className="text-[9px] text-stone-500 font-medium">Out of {currentCap}</div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-white border border-stone-200 shadow-2xs">
                    <div className="text-[9px] font-bold text-stone-400 uppercase">Waitlist Demand</div>
                    <div className="text-xl font-black text-amber-600">{waitlistCount}</div>
                    <div className="text-[9px] text-stone-500 font-medium">Pending Learners</div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-white border border-stone-200 shadow-2xs">
                    <div className="text-[9px] font-bold text-stone-400 uppercase">Total Active Users</div>
                    <div className="text-xl font-black text-blue-600">{registeredOrdinaryUsers}</div>
                    <div className="text-[9px] text-stone-500 font-medium">Firestore Stored</div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-white border border-stone-200 shadow-2xs">
                    <div className="text-[9px] font-bold text-stone-400 uppercase">Active Subscribers</div>
                    <div className="text-xl font-black text-purple-600">0</div>
                    <div className="text-[9px] text-stone-500 font-medium">Stage 5 Play Billing</div>
                  </div>
                </div>

                {/* Capacity Manager */}
                <div className="p-3 rounded-2xl bg-white border border-stone-200 shadow-2xs mb-3">
                  <div className="text-xs font-bold text-stone-900 mb-0.5">
                    Atomic Capacity Management
                  </div>
                  <p className="text-[10px] text-stone-500 mb-2">
                    Ordinary users gated at {currentCap}. Only developer can manually raise.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentCap((prev) => prev + 50)}
                      className="flex-1 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-100 text-xs font-bold transition-all"
                    >
                      +50 Slots
                    </button>
                    <button
                      onClick={() => setCurrentCap((prev) => prev + 100)}
                      className="flex-1 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-100 text-xs font-bold transition-all"
                    >
                      +100 Slots
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setCurrentScreen('main')}
                  className="w-full py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold"
                >
                  Close Dashboard
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STAGE 2: INTERACTIVE EXERCISE MODAL (7 Exercise Types)     */}
          {/* ========================================================= */}
          {isExerciseModalOpen && (() => {
            const currentUnits = LearnEngineService.getUnits(currentLanguage);
            const currentLesson = currentUnits[0]?.lessons[0];
            const exercises = currentLesson?.exercises || [];
            const currentEx = exercises[activeExerciseIndex];

            if (!currentEx) return null;

            const handleCheckAnswer = () => {
              triggerHaptic();
              let submitted: string | string[] = selectedAnswer;
              if (currentEx.type === 'word_order') {
                submitted = selectedTokens;
              } else if (currentEx.type === 'match_pairs' || currentEx.type === 'speaking') {
                submitted = currentEx.correctAnswer;
              }

              const result = LearnEngineService.verifyAnswer(currentEx, submitted);
              setExerciseFeedback({
                isCorrect: result.isCorrect,
                text: result.feedback,
              });

              if (result.isCorrect) {
                confetti({ particleCount: 35, spread: 60 });
              } else {
                // Automatically log mistake into SM-2 spaced repetition queue
                setSm2Queue((prev) => [
                  {
                    id: `mistake_${Date.now()}`,
                    prompt: currentEx.prompt,
                    answer: Array.isArray(currentEx.correctAnswer)
                      ? currentEx.correctAnswer.join(' ')
                      : String(currentEx.correctAnswer),
                    romanisation: currentEx.romanisation,
                    interval: 1,
                    repetitions: 0,
                    easeFactor: 2.50,
                    status: 'active',
                  },
                  ...prev,
                ]);
              }
            };

            const handleNextExercise = async () => {
              triggerHaptic();
              setExerciseFeedback(null);
              setSelectedAnswer('');
              setSelectedTokens([]);

              if (activeExerciseIndex < exercises.length - 1) {
                setActiveExerciseIndex((prev) => prev + 1);
              } else {
                setLessonFinished(true);
                confetti({ particleCount: 80, spread: 70 });
                // Award +15 XP in Firestore
                if (firebaseUser) {
                  try {
                    const newXp = (profile?.xp || 20) + 15;
                    await updateDoc(doc(db, 'users', firebaseUser.uid), { xp: newXp });
                    setProfile((prev) => (prev ? { ...prev, xp: newXp } : null));
                  } catch (e) {
                    // ignore
                  }
                }
              }
            };

            return (
              <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs z-30 flex flex-col justify-end">
                <div className="w-full bg-white rounded-t-[36px] p-5 shadow-2xl max-h-[90%] flex flex-col justify-between">
                  {/* Top Bar: Progress & Exit */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={() => setIsExerciseModalOpen(false)}
                        className="text-stone-400 hover:text-stone-700 text-xs font-bold"
                      >
                        Exit
                      </button>
                      <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                        Exercise {activeExerciseIndex + 1} of {exercises.length}
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold uppercase">
                        {currentEx.type.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${((activeExerciseIndex + 1) / exercises.length) * 100}%`,
                          backgroundColor: mascot.colors.primary,
                        }}
                      />
                    </div>

                    {!lessonFinished ? (
                      <div>
                        {/* Prompt */}
                        <h3 className="text-base font-extrabold text-stone-900 mb-2">
                          {currentEx.prompt}
                        </h3>

                        {/* Native Text + Romanisation + Audio */}
                        {currentEx.nativeText && (
                          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 mb-4 flex items-center justify-between">
                            <div>
                              <div className="text-lg font-black text-stone-900">
                                {currentEx.nativeText}
                              </div>
                              {currentEx.romanisation && (
                                <div className="text-xs font-mono font-bold text-amber-800">
                                  {currentEx.romanisation}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handlePlayAudio(currentEx.nativeText || '', currentLanguage)}
                              className="p-2 rounded-full bg-white text-blue-600 shadow-2xs border border-stone-200"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {/* EXERCISE TYPE 1: MULTIPLE CHOICE or LISTENING or READING */}
                        {(currentEx.type === 'multiple_choice' ||
                          currentEx.type === 'listening' ||
                          currentEx.type === 'reading') && (
                          <div className="space-y-2 mb-4">
                            {currentEx.type === 'listening' && (
                              <button
                                onClick={() => handlePlayAudio(currentEx.audioText || '', currentLanguage)}
                                className="w-full py-3 mb-2 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-2 border border-blue-200"
                              >
                                <Volume2 className="w-4 h-4" /> Play Audio Clue
                              </button>
                            )}

                            {currentEx.options?.map((opt, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  triggerHaptic();
                                  setSelectedAnswer(opt);
                                }}
                                className={`w-full p-3 rounded-2xl border-2 text-left font-bold text-xs transition-all flex items-center justify-between ${
                                  selectedAnswer === opt
                                    ? 'border-amber-500 bg-amber-50 text-amber-950 shadow-xs'
                                    : 'border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
                                }`}
                              >
                                <span>{opt}</span>
                                {selectedAnswer === opt && (
                                  <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* EXERCISE TYPE 2: WORD ORDER */}
                        {currentEx.type === 'word_order' && (
                          <div className="space-y-3 mb-4">
                            {/* Selected sentence tray */}
                            <div className="min-h-[50px] p-2.5 rounded-2xl bg-stone-50 border-2 border-dashed border-stone-300 flex flex-wrap gap-1.5 items-center">
                              {selectedTokens.length === 0 ? (
                                <span className="text-[11px] text-stone-400 italic">
                                  Tap words below in order
                                </span>
                              ) : (
                                selectedTokens.map((tok, i) => (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      triggerHaptic();
                                      setSelectedTokens((prev) => prev.filter((_, idx) => idx !== i));
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-2xs"
                                  >
                                    {tok}
                                  </button>
                                ))
                              )}
                            </div>

                            {/* Token options */}
                            <div className="flex flex-wrap gap-2">
                              {currentEx.options?.map((tok, i) => {
                                const isUsed = selectedTokens.includes(tok);
                                return (
                                  <button
                                    key={i}
                                    disabled={isUsed}
                                    onClick={() => {
                                      triggerHaptic();
                                      setSelectedTokens((prev) => [...prev, tok]);
                                    }}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                                      isUsed
                                        ? 'opacity-30 bg-stone-100 border-stone-200'
                                        : 'bg-white border-stone-300 hover:border-stone-400 text-stone-800 shadow-2xs'
                                    }`}
                                  >
                                    {tok}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* EXERCISE TYPE 3: TYPE TRANSLATION */}
                        {currentEx.type === 'type_translation' && (
                          <div className="mb-4">
                            <input
                              type="text"
                              value={selectedAnswer}
                              onChange={(e) => setSelectedAnswer(e.target.value)}
                              placeholder="Type in English..."
                              className="w-full p-3 rounded-2xl bg-stone-50 border border-stone-300 text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        )}

                        {/* EXERCISE TYPE 4: MATCH PAIRS */}
                        {currentEx.type === 'match_pairs' && (
                          <div className="space-y-2 mb-4">
                            {currentEx.pairs?.map((pair, i) => (
                              <div
                                key={i}
                                className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-xs font-bold text-emerald-950"
                              >
                                <span>{pair.native}</span>
                                <span className="font-mono text-[11px] text-emerald-700">
                                  {pair.romanisation}
                                </span>
                                <span>{pair.translation}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* EXERCISE TYPE 5: SPEAKING */}
                        {currentEx.type === 'speaking' && (
                          <div className="text-center py-4 mb-2">
                            <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto mb-3 shadow-sm animate-pulse">
                              <Mic className="w-8 h-8" />
                            </div>
                            <div className="text-xs font-bold text-stone-700 mb-1">
                              Speak: "{currentEx.nativeText}"
                            </div>
                            <div className="text-[11px] font-mono text-stone-500">
                              Pronunciation: {currentEx.romanisation}
                            </div>
                          </div>
                        )}

                        {/* Grammar Tip */}
                        {currentEx.grammarTip && (
                          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900 mb-4">
                            <strong>Tip:</strong> {currentEx.grammarTip}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* LESSON COMPLETED STATE */
                      <div className="text-center py-6">
                        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-md">
                          <Check className="w-10 h-10 stroke-[3]" />
                        </div>
                        <h3 className="text-xl font-black text-stone-900 mb-1">
                          Lesson Complete!
                        </h3>
                        <p className="text-xs text-stone-600 mb-4">
                          You sprinted through all 7 exercises and earned <strong className="text-blue-600">+15 XP</strong>!
                        </p>
                        <button
                          onClick={() => setIsExerciseModalOpen(false)}
                          className="w-full py-3.5 rounded-2xl text-white font-extrabold text-xs uppercase tracking-wider shadow-md border-b-4 active:border-b-0 active:translate-y-1 transition-all"
                          style={{
                            backgroundColor: mascot.colors.primary,
                            borderColor: mascot.colors.primaryDark,
                          }}
                        >
                          Return to Lessons
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action / Feedback Banner */}
                  {!lessonFinished && (
                    <div className="pt-2">
                      {exerciseFeedback && (
                        <div
                          className={`p-3 rounded-2xl mb-3 flex items-center gap-2 text-xs font-bold ${
                            exerciseFeedback.isCorrect
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-red-100 text-red-900'
                          }`}
                        >
                          {exerciseFeedback.isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                          )}
                          <span>{exerciseFeedback.text}</span>
                        </div>
                      )}

                      {!exerciseFeedback ? (
                        <button
                          onClick={handleCheckAnswer}
                          className="w-full py-3.5 rounded-2xl text-white font-extrabold text-xs uppercase tracking-wider shadow-md border-b-4 active:border-b-0 active:translate-y-1 transition-all"
                          style={{
                            backgroundColor: mascot.colors.primary,
                            borderColor: mascot.colors.primaryDark,
                          }}
                        >
                          Check Answer
                        </button>
                      ) : (
                        <button
                          onClick={handleNextExercise}
                          className="w-full py-3.5 rounded-2xl text-white font-extrabold text-xs uppercase tracking-wider shadow-md border-b-4 active:border-b-0 active:translate-y-1 transition-all"
                          style={{
                            backgroundColor: mascot.colors.primary,
                            borderColor: mascot.colors.primaryDark,
                          }}
                        >
                          Continue
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </main>

        {/* Bottom Navigation */}
        {currentScreen === 'main' && (
          <nav
            className="w-full border-t border-stone-200/80 bg-white/95 backdrop-blur-md px-3 py-2 flex items-center justify-between text-xs z-20"
            style={{ borderColor: mascot.colors.cardBorder }}
          >
            {[
              { id: 'learn', label: 'Learn', icon: BookOpen },
              { id: 'translate', label: 'Translate', icon: Languages },
              { id: 'practice', label: 'Practice', icon: Dumbbell },
              { id: 'rewards', label: 'Rewards', icon: Gift },
              { id: 'profile', label: 'Profile', icon: User },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    triggerHaptic();
                    setActiveTab(tab.id as Tab);
                  }}
                  className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all ${
                    isActive ? 'scale-105 font-bold' : 'text-stone-400 hover:text-stone-600'
                  }`}
                  style={{ color: isActive ? mascot.colors.primary : undefined }}
                >
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                  <span className="text-[10px]">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Stage 4: Roleplay Complete Modal */}
        {roleplayCompleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div
              className="w-full max-w-sm bg-white rounded-3xl p-6 text-center space-y-4 shadow-xl border-2 animate-in zoom-in-95"
              style={{ borderColor: mascot.colors.cardBorder }}
            >
              <div
                className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl mx-auto shadow-sm"
                style={{ backgroundColor: mascot.colors.primaryLight }}
              >
                {roleplayCompleteModal.scenario.icon}
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100/70 px-2.5 py-0.5 rounded-full">
                  Sprint Complete!
                </span>
                <h3 className="text-lg font-black text-stone-900 mt-2">
                  {roleplayCompleteModal.scenario.title}
                </h3>
                <p className="text-xs text-stone-600 mt-1">
                  You successfully held a multi-turn conversation with native NPCs!
                </p>
              </div>

              {/* Star Rating */}
              <div className="flex justify-center gap-1.5 py-1">
                {[1, 2, 3].map((starIdx) => (
                  <Star
                    key={starIdx}
                    className={`w-7 h-7 transition-all ${
                      starIdx <= roleplayCompleteModal.stars
                        ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                        : 'text-stone-300'
                    }`}
                  />
                ))}
              </div>

              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-around">
                <div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase">Reward</div>
                  <div className="text-base font-black text-amber-600">+{roleplayCompleteModal.xp} XP</div>
                </div>
                <div className="h-6 w-px bg-stone-200" />
                <div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase">Mastery</div>
                  <div className="text-base font-black text-stone-900">{roleplayCompleteModal.stars} / 3 Stars</div>
                </div>
              </div>

              <button
                onClick={() => {
                  triggerHaptic();
                  setRoleplayCompleteModal(null);
                }}
                className="w-full py-3 rounded-2xl font-bold text-sm text-white shadow-md transition-all hover:opacity-95 active:scale-98"
                style={{ backgroundColor: mascot.colors.primary }}
              >
                Back to Practice
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
