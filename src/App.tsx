import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  User,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  serverTimestamp,
  limit,
  updateDoc,
  writeBatch,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, googleProvider, githubProvider, handleFirestoreError, OperationType } from './firebase';
import { createUser, signIn, signInWithGoogle, deleteAllUsers, clearUserData } from './authFunctions';
import CareerRoadmap from './components/CareerRoadmap';
import { completeRoadmapStep, checkProfileCompletion } from './services/roadmapService';
import { UserProfile, UserRole, CV, Job, JobApplication, JobMatchResult } from './types';
import { analyzeCV, getChatResponse, analyzeJobMatch, getInterviewResponse, FileData } from './services/gemini';
import { 
  LogOut, 
  Upload, 
  Briefcase, 
  MessageSquare, 
  User as UserIcon, 
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Send,
  Loader2,
  FileText,
  Plus,
  AlertCircle,
  Github,
  Users,
  Search,
  BookOpen,
  Settings,
  Target,
  Medal,
  Mic,
  CheckCircle2,
  Trash2,
  X,
  Pencil,
  GraduationCap,
  Sun,
  Moon,
  Type,
  Accessibility,
  ShieldAlert,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

// --- Helpers ---

const calculateAge = (dob: string): string => {
  if (!dob) return '';
  const birthDate = new Date(dob);
  const today = new Date();
  
  // Minimum 5 years old
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(today.getFullYear() - 5);
  
  if (birthDate > fiveYearsAgo) return '';

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age.toString();
};

// --- Components ---

const FileUpload = ({ 
  onUpload, 
  id, 
  label, 
  icon: Icon = Upload, 
  accept = "image/*", 
  className = "" 
}: { 
  onUpload: (url: string) => void, 
  id: string, 
  label: string, 
  icon?: any,
  accept?: string,
  className?: string
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `uploads/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      onUpload(url);
    } catch (error: any) {
      console.error("Upload failed:", error);
      let errorMessage = "Upload failed. Please try again.";
      if (error.code === 'storage/unauthorized') {
        errorMessage = "Upload failed: Unauthorized. Please ensure you're signed in and Firebase Storage is enabled with appropriate rules.";
      } else if (error.code === 'storage/canceled') {
        errorMessage = "Upload was canceled.";
      } else if (error.code === 'storage/unknown') {
        errorMessage = "Upload failed: Unknown error. Check your internet connection or Firebase console.";
      }
      alert(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      <div className="relative group">
        <input 
          id={id}
          type="file" 
          accept={accept}
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          disabled={isUploading}
        />
        <div className="w-full p-3 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl flex items-center gap-3 text-slate-500 dark:text-slate-400 group-hover:border-skope-blue transition-all">
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-skope-blue" /> : <Icon className="w-4 h-4" />}
          <span className="text-sm">{isUploading ? 'Uploading...' : 'Choose file...'}</span>
        </div>
      </div>
    </div>
  );
};

const CircularATSScore = ({ score }: { score: number }) => {
  const getColor = (s: number) => {
    if (s <= 40) return '#ef4444'; // Red
    if (s <= 70) return '#eab308'; // Yellow
    return '#22c55e'; // Green
  };

  const color = getColor(score);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112">
        <circle
          cx="56"
          cy="56"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-slate-100 dark:text-slate-900"
        />
        <motion.circle
          cx="56"
          cy="56"
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-black text-skope-dark dark:text-white leading-none">{score}%</span>
      </div>
    </div>
  );
};

const AccessibilityMenu = ({ 
  isDarkMode, 
  toggleDarkMode, 
  fontSize, 
  setFontSize,
  boldness,
  setBoldness,
  accFilter,
  setAccFilter
}: { 
  isDarkMode: boolean, 
  toggleDarkMode: () => void, 
  fontSize: number, 
  setFontSize: (size: number) => void,
  boldness: string,
  setBoldness: (b: string) => void,
  accFilter: string,
  setAccFilter: (f: string) => void
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 rounded-full bg-skope-light dark:bg-skope-deep text-skope-navy dark:text-skope-blue hover:bg-skope-sky dark:hover:bg-skope-navy transition-all shadow-lg focus-visible:ring-4 focus-visible:ring-skope-blue outline-none"
        aria-label="Accessibility Menu"
        aria-expanded={isOpen}
      >
        <Accessibility className="w-7 h-7" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-skope-dark p-6 rounded-3xl shadow-2xl border border-skope-light dark:border-skope-steel"
          >
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Display Mode</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDarkMode();
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all font-bold ${
                    isDarkMode 
                      ? 'bg-skope-blue text-white' 
                      : 'bg-skope-light text-skope-navy'
                  }`}
                  aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  <span className="flex items-center gap-3">
                    {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                    {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                  </span>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${isDarkMode ? 'bg-skope-navy' : 'bg-skope-sky'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isDarkMode ? 'right-1' : 'left-1'}`} />
                  </div>
                </button>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Text Size</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                    className="flex-1 p-3 rounded-2xl bg-skope-light/20 dark:bg-skope-deep hover:bg-skope-light/40 transition-all text-skope-dark dark:text-white font-bold"
                    aria-label="Decrease Text Size"
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setFontSize(16)}
                    className="flex-1 p-3 rounded-2xl bg-skope-light/20 dark:bg-skope-deep hover:bg-skope-light/40 transition-all text-skope-dark dark:text-white font-bold"
                    aria-label="Reset Text Size"
                  >
                    <Type className="w-5 h-5 mx-auto" />
                  </button>
                  <button
                    onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                    className="flex-1 p-3 rounded-2xl bg-skope-light/20 dark:bg-skope-deep hover:bg-skope-light/40 transition-all text-skope-dark dark:text-white font-bold"
                    aria-label="Increase Text Size"
                  >
                    A+
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Text Boldness</p>
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'normal', label: 'Normal', icon: <Type className="w-4 h-4" /> },
                    { id: 'bold', label: 'Bold', icon: <Type className="w-4 h-4 stroke-[3]" /> },
                    { id: 'extra-bold', label: 'Extra Bold', icon: <Type className="w-4 h-4 stroke-[4]" /> }
                  ].map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setBoldness(b.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all font-bold text-sm ${
                        boldness === b.id 
                          ? 'bg-skope-navy dark:bg-skope-blue text-white' 
                          : 'bg-skope-light/20 dark:bg-skope-deep text-skope-dark dark:text-white hover:bg-skope-light/40'
                      }`}
                      aria-label={`Set boldness to ${b.label}`}
                    >
                      {b.icon}
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Color Filters</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'none', label: 'Default' },
                    { id: 'grayscale', label: 'Grayscale' },
                    { id: 'high-contrast', label: 'Contrast+' },
                    { id: 'protanopia', label: 'Protanopia' },
                    { id: 'deuteranopia', label: 'Deuteranopia' },
                    { id: 'tritanopia', label: 'Tritanopia' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAccFilter(f.id);
                      }}
                      className={`p-2 rounded-xl transition-all font-bold text-[10px] ${
                        accFilter === f.id 
                          ? 'bg-skope-navy dark:bg-skope-blue text-white' 
                          : 'bg-skope-light/20 dark:bg-skope-deep text-skope-dark dark:text-white hover:bg-skope-light/40'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SplashScreen = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-skope-dark">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 0.8,
          ease: "easeOut",
          repeat: Infinity,
          repeatType: "reverse"
        }}
        className="relative"
      >
        <div className="w-24 h-24 bg-skope-navy dark:bg-skope-blue rounded-[2rem] flex items-center justify-center shadow-2xl shadow-skope-light dark:shadow-none mb-6">
          <GraduationCap className="text-white w-12 h-12" />
        </div>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute -bottom-10 left-0 h-1 bg-skope-navy dark:bg-skope-blue rounded-full"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center"
      >
        <h1 className="text-3xl font-black text-skope-dark dark:text-white tracking-tight mb-2">Skope</h1>
        <p className="text-slate-400 dark:text-slate-500 font-medium uppercase tracking-[0.2em] text-[0.625rem]">Your Career Journey Starts Here</p>
      </motion.div>
    </div>
  );
};

const VerifyEmail = ({ user }: { user: User }) => {
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');

  const handleResend = async () => {
    setIsSending(true);
    try {
      await sendEmailVerification(user);
      setMessage('A new verification email has been dispatched successfully.');
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-200 dark:bg-black p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white dark:bg-skope-dark p-10 rounded-[2.5rem] shadow-2xl border border-skope-light dark:border-skope-steel text-center"
      >
        <div className="w-20 h-20 bg-skope-navy rounded-3xl flex items-center justify-center mx-auto mb-8">
          <GraduationCap className="text-white w-12 h-12" />
        </div>
        <h2 className="text-3xl font-black text-skope-dark dark:text-white mb-4 tracking-tight">Account Verification</h2>
        <div className="text-slate-500 dark:text-slate-400 mb-8 space-y-4 text-sm leading-relaxed text-center">
          <p>
            A verification communication has been issued to <span className="font-bold text-skope-navy dark:text-skope-blue">{user.email}</span>.
          </p>
          <p>
            Kindly locate the message in your inbox and interact with the verification link provided. 
            Once authenticated, you will be granted comprehensive access to the Skope platform.
          </p>
          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-skope-steel flex flex-col items-center gap-2">
            <p className="font-bold italic">Thanks,</p>
            <p className="font-black text-skope-navy dark:text-skope-blue uppercase tracking-[0.2em] text-xs">Skope</p>
            <div className="mt-2 w-10 h-10 bg-skope-navy rounded-xl flex items-center justify-center overflow-hidden">
              <img src="/Logo.png" alt="Skope Logo" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-8 p-4 bg-skope-light/20 dark:bg-skope-deep/40 text-skope-navy dark:text-skope-blue rounded-2xl text-xs font-bold">
            {message}
          </div>
        )}

        <div className="space-y-4">
          <button 
            onClick={handleRefresh}
            className="w-full py-4 bg-skope-navy dark:bg-skope-blue text-white rounded-2xl font-bold hover:bg-skope-deep dark:hover:bg-skope-navy transition-all shadow-lg flex items-center justify-center gap-2 outline-none"
          >
            I've Verified My Email
          </button>
          <button 
            onClick={handleResend}
            disabled={isSending}
            className="w-full py-4 bg-white dark:bg-skope-dark text-skope-navy dark:text-skope-blue border border-skope-sky dark:border-skope-steel rounded-2xl font-bold hover:bg-skope-light/10 dark:hover:bg-skope-deep transition-all flex items-center justify-center gap-2 outline-none disabled:opacity-50"
          >
            {isSending ? <Loader2 className="animate-spin w-5 h-5" /> : 'Resend Verification Email'}
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="w-full py-4 text-slate-400 font-bold hover:text-red-500 transition-all outline-none"
          >
            Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  );
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error && parsed.error.includes('requires an index')) {
          errorMessage = "This view requires a database index. Please check the console for the creation link.";
        }
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-skope-dark p-4">
          <div className="max-w-md w-full bg-white dark:bg-skope-dark/50 rounded-3xl shadow-xl p-8 text-center border border-slate-100 dark:border-skope-steel">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-red-600 dark:text-red-400 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Oops!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-slate-900 dark:bg-skope-blue text-white rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-skope-navy transition-all focus-visible:ring-4 focus-visible:ring-skope-blue outline-none"
              aria-label="Try reloading the page"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const Login = ({ onShowPrivacy }: { onShowPrivacy?: () => void }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSocialLogin = async (provider: any) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setError('');
    try {
      if (provider === googleProvider) {
        await signInWithGoogle();
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        setError('Please allow popups for this website to log in.');
      } else if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Login failed", error);
        setError(error.message);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setError('');
    try {
      if (isSignUp) {
        await createUser(email, password, name);
      } else {
        await signIn(email, password);
      }
    } catch (error: any) {
      console.error("Auth failed", error);
      setError(error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-200 dark:bg-black p-4">
      <motion.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-skope-dark/50 rounded-[2.5rem] shadow-sm p-10 border border-skope-light dark:border-skope-steel"
      >
        <div className="text-center mb-10">
          <motion.div 
            layout
            className="w-16 h-16 bg-skope-navy rounded-2xl flex items-center justify-center mx-auto mb-6"
          >
            <GraduationCap className="text-white w-10 h-10" />
          </motion.div>
          <h1 className="text-3xl font-black text-skope-dark dark:text-white mb-2 tracking-tight">
            {isSignUp ? 'Join Skope' : 'Welcome Back'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {isSignUp ? (
              <>
                Create your account to start your journey. By signing up, you agree to our{' '}
                <button 
                  type="button"
                  onClick={() => onShowPrivacy?.()} 
                  className="text-skope-navy dark:text-skope-blue font-bold hover:underline underline-offset-4"
                >
                  Privacy Policy
                </button>.
              </>
            ) : 'Your career journey continues here.'}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm flex items-center gap-2" 
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-8">
          <AnimatePresence mode="popLayout">
            {isSignUp && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1"
              >
                <label htmlFor="name" className="text-xs font-bold text-slate-400 uppercase ml-4">Full Name</label>
                <input 
                  id="name"
                  type="text"
                  placeholder="e.g. John Doe"
                  required={isSignUp}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-2xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white transition-all"
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-bold text-slate-400 uppercase ml-4">Email Address</label>
            <input 
              id="email"
              type="email"
              placeholder="e.g. john@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-2xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white transition-all"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-bold text-slate-400 uppercase ml-4">Password</label>
            <input 
              id="password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-2xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white transition-all"
            />
          </div>
          <button 
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-4 bg-skope-navy dark:bg-skope-blue text-white rounded-2xl font-bold hover:bg-skope-deep dark:hover:bg-skope-navy transition-all shadow-lg flex items-center justify-center gap-2 focus-visible:ring-4 focus-visible:ring-skope-blue outline-none"
            aria-label={isLoggingIn ? "Processing..." : (isSignUp ? "Create Account" : "Sign In")}
          >
            {isLoggingIn ? <Loader2 className="animate-spin w-5 h-5" /> : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-skope-light dark:border-skope-steel"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="px-4 bg-white dark:bg-skope-dark text-slate-400 font-bold tracking-widest">Or continue with</span></div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button 
            onClick={() => handleSocialLogin(googleProvider)}
            disabled={isLoggingIn}
            className="flex items-center justify-center gap-3 p-4 border border-skope-sky dark:border-skope-steel rounded-2xl hover:bg-skope-light/10 dark:hover:bg-skope-deep transition-all font-bold text-skope-dark dark:text-white focus-visible:ring-4 focus-visible:ring-skope-blue outline-none"
            aria-label="Sign in with Google"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />
            Google
          </button>
          <button 
            onClick={() => handleSocialLogin(githubProvider)}
            disabled={isLoggingIn}
            className="flex items-center justify-center gap-3 p-4 border border-skope-sky dark:border-skope-steel rounded-2xl hover:bg-skope-light/10 dark:hover:bg-skope-deep transition-all font-bold text-skope-dark dark:text-white focus-visible:ring-4 focus-visible:ring-skope-blue outline-none"
            aria-label="Sign in with GitHub"
          >
            <Github className="w-5 h-5" />
            GitHub
          </button>
        </div>

        <p className="text-center text-slate-500 dark:text-slate-400 text-sm font-medium">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-skope-navy dark:text-skope-blue font-bold hover:underline focus-visible:ring-2 focus-visible:ring-skope-blue outline-none rounded"
            aria-label={isSignUp ? "Switch to Sign In" : "Switch to Sign Up"}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

const RoleSelection = ({ onSelect, existingProfile }: { onSelect: (role: UserRole, initialData?: Partial<UserProfile>) => void, existingProfile?: UserProfile | null }) => {
  const [step, setStep] = useState<'role' | 'recruiter_details' | 'student_details'>(
    existingProfile ? (existingProfile.role === 'recruiter' ? 'recruiter_details' : 'student_details') : 'role'
  );
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(existingProfile?.role || null);
  
  // Photo/Logo fields
  const [photoURL, setPhotoURL] = useState(existingProfile?.photoURL || '');

  // Recruiter fields
  const [companyName, setCompanyName] = useState(existingProfile?.companyName || '');
  const [companyLogo, setCompanyLogo] = useState(existingProfile?.companyLogo || '');
  const [companyDescription, setCompanyDescription] = useState(existingProfile?.companyDescription || '');

  // Student fields
  const [studentName, setStudentName] = useState(existingProfile?.displayName || '');
  const [studentDob, setStudentDob] = useState(existingProfile?.birthday || '');
  const [studentAge, setStudentAge] = useState(existingProfile?.age?.toString() || '');
  const [studentLocation, setStudentLocation] = useState(existingProfile?.location || '');
  const [studentPhone, setStudentPhone] = useState(existingProfile?.phone || '');
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [dobError, setDobError] = useState('');

  const handleDobChange = (val: string) => {
    setStudentDob(val);
    const age = calculateAge(val);
    setStudentAge(age);
  };

  const handleVerifyPhone = () => {
    if (!studentPhone) return;
    setIsVerifyingPhone(true);
    // Simulate verification
    setTimeout(() => {
      setIsVerifyingPhone(false);
      setIsPhoneVerified(true);
    }, 1500);
  };

  if (step === 'student_details') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-200 dark:bg-black p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-skope-dark p-10 rounded-[2.5rem] shadow-2xl border border-skope-light dark:border-skope-steel"
        >
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setStep('role')}
              className="p-2 text-slate-400 hover:text-skope-blue transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-black text-skope-dark dark:text-white text-center flex-1 mr-8">Applicant Details</h2>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            onSelect('student', { 
              displayName: studentName, 
              birthday: studentDob, 
              age: parseInt(studentAge), 
              location: studentLocation,
              phone: studentPhone,
              photoURL: photoURL
            });
          }} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-4">Profile Picture URL</label>
              <input 
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full p-4 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-2xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-4">Full Name</label>
              <input 
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Your full name"
                className="w-full p-4 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-2xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-4">Date of Birth</label>
                <input 
                  type="date"
                  value={studentDob}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className={`w-full p-4 bg-skope-light/20 dark:bg-skope-deep border rounded-2xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white transition-all ${
                    dobError ? 'border-red-500' : 'border-skope-sky dark:border-skope-steel'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-4">Age</label>
                <input 
                  type="number"
                  readOnly
                  value={studentAge}
                  placeholder="Computed age"
                  className="w-full p-4 bg-slate-100 dark:bg-skope-deep/50 border border-skope-sky dark:border-skope-steel rounded-2xl outline-none dark:text-white cursor-not-allowed opacity-80"
                />
              </div>
            </div>
            {dobError && <p className="text-[10px] text-red-500 font-bold ml-4 animate-pulse">{dobError}</p>}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-4">Location</label>
              <input 
                value={studentLocation}
                onChange={(e) => setStudentLocation(e.target.value)}
                placeholder="City, Country"
                className="w-full p-4 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-2xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center ml-4 mr-4">
                <label className="text-xs font-bold text-slate-400 uppercase">Phone Number <span className="text-[10px] font-normal lowercase">(Optional)</span></label>
                {isPhoneVerified && <span className="text-[10px] text-green-500 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified</span>}
              </div>
              <div className="flex gap-2">
                <input 
                  value={studentPhone}
                  onChange={(e) => {
                    setStudentPhone(e.target.value);
                    setIsPhoneVerified(false);
                  }}
                  placeholder="+1 234 567 890"
                  className="flex-1 p-4 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-2xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                />
                {studentPhone && !isPhoneVerified && (
                  <button 
                    type="button"
                    onClick={handleVerifyPhone}
                    disabled={isVerifyingPhone}
                    className="px-4 bg-skope-navy dark:bg-skope-blue text-white rounded-2xl text-xs font-bold hover:bg-skope-deep transition-all disabled:opacity-50"
                  >
                    {isVerifyingPhone ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Verify'}
                  </button>
                )}
              </div>
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-skope-navy dark:bg-skope-blue text-white rounded-2xl font-bold hover:bg-skope-deep dark:hover:bg-skope-navy transition-all shadow-lg"
            >
              Complete Setup
            </button>
          </form>
          <button 
            onClick={() => signOut(auth)}
            className="w-full mt-6 py-3 text-slate-400 hover:text-red-500 font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </motion.div>
      </div>
    );
  }

  if (step === 'recruiter_details') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-200 dark:bg-black p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-skope-dark p-10 rounded-[2.5rem] shadow-2xl border border-skope-light dark:border-skope-steel"
        >
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setStep('role')}
              className="p-2 text-slate-400 hover:text-skope-blue transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-black text-skope-dark dark:text-white text-center flex-1 mr-8">Company Details</h2>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            onSelect('recruiter', { companyName, companyLogo, companyDescription });
          }} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-4">Company Name</label>
              <input 
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Skope Inc."
                className="w-full p-4 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-2xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-4">Company Logo URL</label>
              <input 
                value={companyLogo}
                onChange={(e) => setCompanyLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full p-4 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-2xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-4">Company Description</label>
              <textarea 
                value={companyDescription}
                onChange={(e) => setCompanyDescription(e.target.value)}
                placeholder="Tell us about your company..."
                className="w-full h-32 p-4 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-2xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white resize-none"
              />
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-skope-navy dark:bg-skope-blue text-white rounded-2xl font-bold hover:bg-skope-deep dark:hover:bg-skope-navy transition-all shadow-lg"
            >
              Complete Setup
            </button>
          </form>
          <button 
            onClick={() => signOut(auth)}
            className="w-full mt-6 py-3 text-slate-400 hover:text-red-500 font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-200 dark:bg-black p-4">
      <div className="max-w-2xl w-full text-center mb-12">
        <h2 className="text-3xl font-bold text-skope-dark dark:text-white mb-4">Welcome to Skope</h2>
        <p className="text-slate-500 dark:text-slate-400">How would you like to use the platform?</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        <button 
          onClick={() => {
            setSelectedRole('student');
            setStep('student_details');
          }}
          className="group bg-white dark:bg-skope-dark/50 p-8 rounded-3xl shadow-sm border border-skope-light dark:border-skope-steel hover:border-skope-blue hover:shadow-xl transition-all text-left focus-visible:ring-4 focus-visible:ring-skope-blue outline-none"
          aria-label="Join as an Applicant"
        >
          <div className="w-12 h-12 bg-skope-light dark:bg-skope-deep text-skope-navy dark:text-skope-light rounded-xl flex items-center justify-center mb-6 group-hover:bg-skope-navy group-hover:text-white transition-colors">
            <UserIcon />
          </div>
          <h3 className="text-xl font-bold text-skope-dark dark:text-white mb-2">I'm an Applicant</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">Upload your CV, get AI analysis, and find your dream career path.</p>
          <div className="flex items-center text-skope-navy dark:text-skope-blue font-medium">
            Get Started <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </button>
        <button 
          onClick={() => {
            setSelectedRole('recruiter');
            setStep('recruiter_details');
          }}
          className="group bg-white dark:bg-skope-dark/50 p-8 rounded-3xl shadow-sm border border-skope-light dark:border-skope-steel hover:border-skope-blue hover:shadow-xl transition-all text-left focus-visible:ring-4 focus-visible:ring-skope-blue outline-none"
          aria-label="Join as a Recruiter"
        >
          <div className="w-12 h-12 bg-skope-light dark:bg-skope-deep text-skope-navy dark:text-skope-light rounded-xl flex items-center justify-center mb-6 group-hover:bg-skope-navy group-hover:text-white transition-colors">
            <Briefcase />
          </div>
          <h3 className="text-xl font-bold text-skope-dark dark:text-white mb-2">I'm a Recruiter</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">Post job opportunities and find the best talent for your company.</p>
          <div className="flex items-center text-skope-navy dark:text-skope-blue font-medium">
            Get Started <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </button>
      </div>
      <button 
        onClick={() => signOut(auth)}
        className="mt-12 text-slate-400 hover:text-skope-blue font-medium flex items-center gap-2 transition-colors"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'skope' | 'buddy' | 'jobs' | 'profile' | 'courses' | 'applicants' | 'roadmap'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('skope_dark_mode') === 'true');
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('skope_font_size') || '15'));
  const [boldness, setBoldness] = useState(() => localStorage.getItem('skope_boldness') || 'normal');
  const [accessibilityFilter, setAccessibilityFilter] = useState(() => localStorage.getItem('skope_acc_filter') || 'none');
  const [unreadCounts, setUnreadCounts] = useState<{ buddy: number, skope: number, applicants: number }>({ buddy: 0, skope: 0, applicants: 0 });
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    // Listen to buddy chats
    const buddyQ = query(collection(db, 'buddy_chats'), where('participants', 'array-contains', profile.uid));
    const unsubscribeBuddy = onSnapshot(buddyQ, (snapshot) => {
      let count = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        count += (data.unreadCount?.[profile.uid] || 0);
      });
      setUnreadCounts(prev => ({ ...prev, buddy: count }));
    });

    // Listen to job applications (Skope chat for students)
    if (profile.role === 'student') {
      const skopeQ = query(collection(db, 'job_applications'), where('studentId', '==', profile.uid));
      const unsubscribeSkope = onSnapshot(skopeQ, (snapshot) => {
        let count = 0;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          count += (data.unreadCount?.student || 0);
        });
        setUnreadCounts(prev => ({ ...prev, skope: count }));
      });
      return () => {
        unsubscribeBuddy();
        unsubscribeSkope();
      };
    } else {
      const applicantsQ = query(collection(db, 'job_applications'), where('recruiterId', '==', profile.uid));
      const unsubscribeApplicants = onSnapshot(applicantsQ, (snapshot) => {
        let count = 0;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          count += (data.unreadCount?.recruiter || 0);
        });
        setUnreadCounts(prev => ({ ...prev, applicants: count }));
      });
      return () => {
        unsubscribeBuddy();
        unsubscribeApplicants();
      };
    }
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('skope_dark_mode', isDarkMode.toString());
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('skope_font_size', fontSize.toString());
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('skope_boldness', boldness);
    const root = document.documentElement;
    root.classList.remove('font-bold-mode', 'font-extra-bold-mode');
    if (boldness === 'bold') root.classList.add('font-bold-mode');
    if (boldness === 'extra-bold') root.classList.add('font-extra-bold-mode');
  }, [boldness]);

  useEffect(() => {
    localStorage.setItem('skope_acc_filter', accessibilityFilter);
    const root = document.documentElement;
    root.classList.remove('filter-grayscale', 'filter-high-contrast', 'filter-protanopia', 'filter-deuteranopia', 'filter-tritanopia');
    if (accessibilityFilter !== 'none') {
      root.classList.add(`filter-${accessibilityFilter}`);
    }
  }, [accessibilityFilter]);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;
    
    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const splashDelay = new Promise(resolve => setTimeout(resolve, 1500));
      
      if (firebaseUser) {
        setUser(firebaseUser);
        const docRef = doc(db, 'users', firebaseUser.uid);
        
        // Use a real-time listener for the profile
        profileUnsubscribe = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
        });
      } else {
        setUser(null);
        setProfile(null);
        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = null;
        }
      }
      
      await splashDelay;
      setLoading(false);
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const handleRoleSelect = async (role: UserRole, initialData?: Partial<UserProfile>) => {
    if (!user) return;
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      role: role,
      createdAt: new Date().toISOString(),
      desiredJobs: [],
      ...initialData
    };
    
    try {
      await setDoc(doc(db, 'users', user.uid), newProfile);
      setProfile(newProfile);
      await checkProfileCompletion(user.uid, newProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    // Filter out undefined values from updates to avoid Firestore errors
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    const updatedProfile = { ...profile, ...cleanUpdates };
    
    try {
      await setDoc(doc(db, 'users', user.uid), updatedProfile);
      setProfile(updatedProfile as UserProfile);
      await checkProfileCompletion(user.uid, updatedProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  if (loading) {
    return (
      <div className={`${isDarkMode ? 'dark' : ''} font-sans bg-slate-200 dark:bg-black`}>
        <SplashScreen />
      </div>
    );
  }

  const accessibilityProps = {
    isDarkMode,
    toggleDarkMode: () => setIsDarkMode(prev => !prev),
    fontSize,
    setFontSize: (size: number) => setFontSize(size),
    boldness,
    setBoldness: (b: string) => setBoldness(b),
    accFilter: accessibilityFilter,
    setAccFilter: (f: string) => setAccessibilityFilter(f)
  };

  const isProfileComplete = (p: UserProfile | null) => {
    if (!p) return false;
    if (p.role === 'student') {
      return !!p.displayName;
    }
    if (p.role === 'recruiter') {
      return !!p.companyName;
    }
    return true;
  };

  if (showPrivacyPolicy) return (
    <div className={`${isDarkMode ? 'dark' : ''} font-sans bg-slate-200 dark:bg-black`}>
      <PrivacyPolicy onBack={() => setShowPrivacyPolicy(false)} />
    </div>
  );

  if (!user) return (
    <div className={`${isDarkMode ? 'dark' : ''} font-sans bg-slate-200 dark:bg-black`}>
      <div className="fixed top-4 right-4 z-[60]">
        <AccessibilityMenu {...accessibilityProps} />
      </div>
      <Login onShowPrivacy={() => setShowPrivacyPolicy(true)} />
    </div>
  );

  if (!user.emailVerified) return (
    <div className={`${isDarkMode ? 'dark' : ''} font-sans bg-slate-200 dark:bg-black`}>
      <div className="fixed top-4 right-4 z-[60]">
        <AccessibilityMenu {...accessibilityProps} />
      </div>
      <VerifyEmail user={user} />
    </div>
  );

  if (!profile || !isProfileComplete(profile)) return (
    <div className={`${isDarkMode ? 'dark' : ''} font-sans bg-slate-200 dark:bg-black`}>
      <div className="fixed top-4 right-4 z-[60]">
        <AccessibilityMenu {...accessibilityProps} />
      </div>
      <RoleSelection onSelect={handleRoleSelect} existingProfile={profile} />
    </div>
  );

  return (
    <ErrorBoundary>
      <div className={`${isDarkMode ? 'dark' : ''} min-h-screen flex flex-col bg-slate-200 dark:bg-black font-sans transition-colors duration-300`}>
      {/* Header */}
      <header className="bg-slate-100 dark:bg-black border-b border-skope-light dark:border-skope-steel px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-skope-navy rounded-lg flex items-center justify-center">
            <GraduationCap className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-black text-skope-dark dark:text-white tracking-tight">Skope</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:block text-right">
            <p className="text-xs font-black text-skope-dark dark:text-white uppercase tracking-wider">{profile.displayName}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{profile.role}</p>
          </div>
          <AccessibilityMenu {...accessibilityProps} />
          <button 
            onClick={() => setActiveTab('profile')}
            className={`p-2 rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-skope-light dark:bg-skope-deep text-skope-navy dark:text-skope-light' : 'text-slate-400 hover:text-skope-navy hover:bg-skope-light dark:hover:bg-skope-deep'}`}
            aria-label="View Profile"
          >
            <UserIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            aria-label="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'profile' ? (
          <ProfileView 
            profile={profile} 
            onUpdate={updateProfile} 
            accFilter={accessibilityFilter}
            setAccFilter={setAccessibilityFilter}
            onShowPrivacy={() => setShowPrivacyPolicy(true)}
          />
        ) : profile.role === 'student' ? (
          <StudentView profile={profile} activeTab={activeTab} onViewProfile={setViewingProfileId} />
        ) : (
          <RecruiterView profile={profile} activeTab={activeTab} onViewProfile={setViewingProfileId} />
        )}
      </main>

      <SkopeBuddyPopup profile={profile} />

      <ProfileModal 
        userId={viewingProfileId} 
        isOpen={!!viewingProfileId} 
        onClose={() => setViewingProfileId(null)} 
      />

      {/* SVG Filters for Colorblindness */}
      <svg className="hidden">
        <defs>
          <filter id="protanopia-filter">
            <feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0" />
          </filter>
          <filter id="deuteranopia-filter">
            <feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0" />
          </filter>
          <filter id="tritanopia-filter">
            <feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0" />
          </filter>
        </defs>
      </svg>

      {/* Bottom Nav */}
      <nav className="bg-slate-100 dark:bg-black border-t border-skope-light dark:border-skope-steel px-2 sm:px-6 py-3 flex justify-around items-center sticky bottom-0">
        <NavButton 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')}
          icon={profile.role === 'student' ? <Search /> : <Briefcase />}
          label={profile.role === 'student' ? "Analysis" : "My Jobs"}
        />
        <NavButton 
          active={activeTab === 'jobs'} 
          onClick={() => setActiveTab('jobs')}
          icon={profile.role === 'student' ? <Briefcase /> : <MessageSquare />}
          label={profile.role === 'student' ? "Jobs" : "Applicants"}
          badge={profile.role === 'recruiter' ? unreadCounts.applicants : unreadCounts.skope}
        />
        {profile.role === 'student' && (
          <>
            <NavButton 
              active={activeTab === 'roadmap'} 
              onClick={() => setActiveTab('roadmap')}
              icon={<Target />}
              label="Roadmap"
            />
            <NavButton 
              active={activeTab === 'courses'} 
              onClick={() => setActiveTab('courses')}
              icon={<BookOpen />}
              label="Courses"
            />
            <NavButton 
              active={activeTab === 'buddy'} 
              onClick={() => setActiveTab('buddy')}
              icon={<Users />}
              label="Career Buddy"
              badge={unreadCounts.buddy}
            />
          </>
        )}
      </nav>
    </div>
    </ErrorBoundary>
  );
}

const PrivacyPolicy = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 max-w-2xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full bg-white dark:bg-skope-dark p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-skope-light dark:border-skope-steel space-y-8"
      >
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-skope-deep rounded-full transition-colors"
            aria-label="Back to Sign Up"
          >
            <ChevronLeft className="w-6 h-6 text-skope-navy dark:text-skope-blue" />
          </button>
          <h1 className="text-3xl font-black text-skope-dark dark:text-white tracking-tight">Skope Privacy Policy</h1>
        </div>

        <div className="space-y-6 text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
          <section>
            <p className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[10px] mb-2">Last Updated</p>
            <p className="font-medium text-skope-navy dark:text-skope-blue">April 18, 2026</p>
          </section>

          <section className="bg-skope-light/10 dark:bg-skope-deep/30 p-6 rounded-3xl border border-skope-light dark:border-skope-steel">
            <h3 className="font-bold text-skope-dark dark:text-white mb-2">Academic Research Project</h3>
            <p>
              Skope is a student-led research initiative dedicated to improving career development and the recruitment journey for students and employers. This application serves as a platform for data-driven career growth and research within an academic context.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="font-bold text-skope-dark dark:text-white">What We Collect</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 dark:bg-black/20 rounded-2xl">
                <p className="font-bold text-skope-navy dark:text-skope-blue mb-1">Identity Info</p>
                <p className="text-xs">Your name, email address, and professional background details (e.g. skills, location).</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-black/20 rounded-2xl">
                <p className="font-bold text-skope-navy dark:text-skope-blue mb-1">Career Data</p>
                <p className="text-xs">Job preferences, CV analysis results, and interactions with recruiters.</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-bold text-skope-dark dark:text-white">How Your Data is Used</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>In-App Insights</strong>: Generating career roadmaps and job match scores to help your professional growth.</li>
              <li><strong>Academic Scholarship</strong>: Data is analyzed to support student research on modern recruitment trends.</li>
              <li><strong>Ecosystem Research</strong>: Observing broader patterns in the labor market to contribute to public knowledge.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="font-bold text-skope-dark dark:text-white">Research & Data Usage</h3>
            <p>
              Data used for research reporting is strictly **anonymized or aggregated**. Your individual identity remains private and is never linked to public findings.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="font-bold text-skope-dark dark:text-white">Data Storage & Security</h3>
            <p>
              We keep your information safe using standard cloud encryption and strictly restricted access. We do not share your data with third parties for commercial use.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="font-bold text-skope-dark dark:text-white">Your Consent & Rights</h3>
            <p>
              By using this app, you participate in our student research project. You have the right to request a copy of your stored data or withdraw your consent at any time.
            </p>
          </section>

          <section className="bg-red-50 dark:bg-red-900/10 p-6 rounded-3xl border border-red-100 dark:border-red-900/30">
            <h3 className="font-bold text-red-600 dark:text-red-400 mb-2">Account Deletion</h3>
            <p className="text-red-600/80 dark:text-red-400/80">
              When you delete your profile, your account and all associated personal data are removed from our active databases. Some non-identifiable aggregated data may remain in archival research sets.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-skope-dark dark:text-white mb-2">Contact</h3>
            <p>
              For research inquiries, contact us at <span className="text-skope-navy dark:text-skope-blue font-bold">RB1591@live.mdx.ac.uk</span>.
            </p>
          </section>
        </div>

        <button 
          onClick={onBack}
          className="w-full py-4 bg-skope-navy dark:bg-skope-blue text-white rounded-2xl font-bold hover:bg-skope-deep dark:hover:bg-skope-navy transition-all shadow-lg flex items-center justify-center gap-2 outline-none"
        >
          Back to Sign Up
        </button>
      </motion.div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, badge }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all relative ${
      active 
        ? 'text-skope-navy dark:text-white bg-skope-light dark:bg-skope-blue shadow-lg shadow-skope-light dark:shadow-none' 
        : 'text-slate-400 hover:text-skope-navy dark:hover:text-skope-light hover:bg-skope-light/50 dark:hover:bg-skope-deep/50'
    } focus-visible:ring-2 focus-visible:ring-skope-blue outline-none`}
    aria-label={label}
    aria-current={active ? 'page' : undefined}
  >
    <div className="relative">
      {React.cloneElement(icon, { className: 'w-6 h-6' })}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-skope-dark animate-in zoom-in duration-300">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </div>
    <span className="text-[0.625rem] font-bold uppercase tracking-wider">{label}</span>
  </button>
);

const SkopeBuddyPopup = ({ profile }: { profile: UserProfile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const response = await getChatResponse(userMsg, `User is a ${profile.role} named ${profile.displayName}. They are interested in: ${profile.desiredJobs?.join(', ')}.`);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      console.error("Chat failed", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-white dark:bg-skope-dark rounded-3xl shadow-2xl border border-skope-light dark:border-skope-steel overflow-hidden flex flex-col"
          >
            <div className="bg-skope-navy dark:bg-skope-blue p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Skope Buddy</h3>
                  <p className="text-[10px] text-skope-sky">AI Career Assistant</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-skope-deep/10">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-400 dark:text-slate-500 text-sm">Ask me anything about your career, CV, or job search!</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-skope-navy dark:bg-skope-blue text-white' : 'bg-white dark:bg-skope-dark text-skope-dark dark:text-slate-200 border border-skope-light dark:border-skope-steel'}`}>
                    <div className="markdown-body">
                      <Markdown>{m.text}</Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-skope-dark p-3 rounded-2xl border border-skope-light dark:border-skope-steel animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-skope-light dark:border-skope-steel flex gap-2 bg-white dark:bg-skope-dark">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-3 bg-slate-100 dark:bg-skope-deep border border-transparent focus:border-skope-blue rounded-xl outline-none text-sm dark:text-white"
              />
              <button className="p-3 bg-skope-navy dark:bg-skope-blue text-white rounded-xl hover:opacity-90 transition-all">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-skope-navy dark:bg-skope-blue text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all active:scale-95 group"
        aria-label="Open Skope Buddy"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />}
      </button>
    </div>
  );
};

const StudentJobChat = ({ profile, onViewProfile }: { profile: UserProfile, onViewProfile: (uid: string) => void }) => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [messages, setMessages] = useState<{role: string, text: string}[]>([]);
  const [input, setInput] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'jobs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'job_applications'), where('studentId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobApplication)));
    });
    return unsubscribe;
  }, [profile.uid]);

  useEffect(() => {
    if (!selectedApp) return;
    const q = query(collection(db, 'job_applications', selectedApp.id, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => doc.data() as any));
    });

    // Mark as read
    const markAsRead = async () => {
      const appRef = doc(db, 'job_applications', selectedApp.id);
      const appDoc = await getDoc(appRef);
      if (appDoc.exists()) {
        const data = appDoc.data();
        if (data.unreadCount?.student > 0) {
          await updateDoc(appRef, {
            'unreadCount.student': 0
          });
        }
      }
    };
    markAsRead();

    return unsubscribe;
  }, [selectedApp]);

  const handleSend = async (text: string, type: 'text' | 'image' | 'file' = 'text', url?: string) => {
    if (!selectedApp) return;
    try {
      const appRef = doc(db, 'job_applications', selectedApp.id);
      const appDoc = await getDoc(appRef);
      if (appDoc.exists()) {
        await updateDoc(appRef, {
          'unreadCount.recruiter': (appDoc.data().unreadCount?.recruiter || 0) + 1,
          lastMessage: type === 'text' ? text : `Sent a ${type}`,
          lastMessageAt: serverTimestamp()
        });
      }

      await addDoc(collection(db, 'job_applications', selectedApp.id, 'messages'), {
        role: 'student',
        text,
        type,
        url: url || null,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Chat failed", error);
    }
  };

  const filteredApps = applications.filter(app => {
    const job = jobs.find(j => j.id === app.jobId);
    return job?.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           job?.company.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]">
      <div className={`lg:col-span-1 flex flex-col gap-4 ${selectedApp ? 'hidden lg:flex' : 'flex'}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            placeholder="Search job chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-3 w-full bg-white dark:bg-skope-dark border border-skope-light dark:border-skope-steel rounded-2xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white text-sm"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-3">
          {filteredApps.length === 0 ? (
            <p className="text-center py-8 text-slate-400 italic">No applications found.</p>
          ) : (
            filteredApps.map(app => {
              const job = jobs.find(j => j.id === app.jobId);
              return (
                <button
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex gap-3 items-center ${
                    selectedApp?.id === app.id
                      ? 'bg-skope-navy dark:bg-skope-blue border-transparent text-white shadow-lg'
                      : 'bg-white dark:bg-skope-dark border-skope-light dark:border-skope-steel text-skope-dark dark:text-white hover:border-skope-blue'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-skope-deep flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 dark:border-skope-steel">
                    {job?.companyLogo ? (
                      <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <Briefcase className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold truncate">{job?.title || 'Loading...'}</h4>
                    <p className={`text-xs truncate ${selectedApp?.id === app.id ? 'text-skope-sky' : 'text-slate-500'}`}>{job?.company}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className={`lg:col-span-2 bg-white dark:bg-skope-dark rounded-3xl border border-skope-light dark:border-skope-steel overflow-hidden flex flex-col shadow-sm ${selectedApp ? 'block' : 'hidden lg:block'}`}>
        {selectedApp ? (
          <>
            <div className="p-4 border-b border-skope-light dark:border-skope-steel bg-slate-50 dark:bg-skope-deep/20 flex items-center gap-3">
              <button 
                onClick={() => setSelectedApp(null)}
                className="lg:hidden p-2 hover:bg-slate-200 dark:hover:bg-skope-deep rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 
                  className="font-bold text-skope-dark dark:text-white hover:text-skope-blue cursor-pointer transition-colors"
                  onClick={() => {
                    const job = jobs.find(j => j.id === selectedApp.jobId);
                    if (job) onViewProfile(job.recruiterId);
                  }}
                >
                  {jobs.find(j => j.id === selectedApp.jobId)?.company}
                </h3>
                <p className="text-xs text-slate-500">{jobs.find(j => j.id === selectedApp.jobId)?.title}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-skope-dark/50">
              <div className="bg-skope-navy/5 dark:bg-skope-blue/5 border border-skope-navy/10 dark:border-skope-blue/10 p-4 rounded-2xl mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldAlert className="w-5 h-5 text-skope-navy dark:text-skope-blue" />
                  <h5 className="font-bold text-skope-dark dark:text-white text-sm">Professional Safe Space</h5>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Skope is a professional environment. Please maintain a safe and respectful space for all users. 
                  Any inappropriate behavior or harassment will result in immediate account suspension.
                </p>
              </div>
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-400 dark:text-slate-500">No messages yet. The recruiter will reach out soon!</p>
                </div>
              )}
              {messages.map((m, i) => (
                <MessageBubble key={i} message={m} isOwn={m.role === 'student'} />
              ))}
            </div>
            <ChatInput onSend={(text) => handleSend(text)} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-400">Select a job application to view chat</h3>
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileView = ({ profile, onUpdate, accFilter, setAccFilter, onShowPrivacy }: { 
  profile: UserProfile, 
  onUpdate: (updates: Partial<UserProfile>) => void,
  accFilter: string,
  setAccFilter: (filter: string) => void,
  onShowPrivacy: () => void
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    setIsEditing(false);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-skope-dark p-8 rounded-3xl shadow-sm border border-skope-light dark:border-skope-steel">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-skope-dark dark:text-white">Your Profile</h2>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="text-skope-navy dark:text-skope-blue font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-skope-blue outline-none rounded"
            aria-label={isEditing ? "Cancel editing" : "Edit profile"}
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {profile.role === 'student' && (
              <>
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                  <input 
                    id="edit-name"
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                    className="w-full p-3 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="edit-bio" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bio</label>
                  <textarea 
                    id="edit-bio"
                    value={formData.bio || ''}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    placeholder="Tell us a bit about yourself..."
                    className="w-full h-24 p-3 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white resize-none"
                  />
                </div>
                <div>
                  <label htmlFor="edit-birthday" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Birthday</label>
                  <input 
                    id="edit-birthday"
                    type="date"
                    value={formData.birthday || ''}
                    onChange={(e) => {
                      const dob = e.target.value;
                      const age = calculateAge(dob);
                      setFormData({...formData, birthday: dob, age: parseInt(age) || 0});
                    }}
                    className="w-full p-3 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="edit-age" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Age</label>
                  <input 
                    id="edit-age"
                    type="number"
                    readOnly
                    value={formData.age || ''}
                    placeholder="Auto-calculated"
                    className="w-full p-3 bg-slate-100 dark:bg-skope-deep/50 border border-skope-sky dark:border-skope-steel rounded-xl outline-none dark:text-white cursor-not-allowed opacity-80"
                  />
                </div>
                <div>
                  <label htmlFor="edit-location" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location</label>
                  <input 
                    id="edit-location"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full p-3 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="edit-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number <span className="text-[10px] font-normal lowercase">(Optional)</span></label>
                  <input 
                    id="edit-phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+1 234 567 890"
                    className="w-full p-3 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="edit-photo" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Profile Picture URL</label>
                  <input 
                    id="edit-photo"
                    value={formData.photoURL || ''}
                    onChange={(e) => setFormData({...formData, photoURL: e.target.value})}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full p-3 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="edit-jobs" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Desired Jobs (comma separated)</label>
                  <input 
                    id="edit-jobs"
                    value={formData.desiredJobs?.join(', ') || ''}
                    onChange={(e) => setFormData({...formData, desiredJobs: e.target.value.split(',').map(s => s.trim())})}
                    className="w-full p-3 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                  />
                </div>
              </>
            )}
            {profile.role === 'recruiter' && (
              <>
                <div>
                  <label htmlFor="edit-company" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
                  <input 
                    id="edit-company"
                    value={formData.companyName || ''}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    className="w-full p-3 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="edit-company-logo" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Logo URL</label>
                  <input 
                    id="edit-company-logo"
                    value={formData.companyLogo || ''}
                    onChange={(e) => setFormData({...formData, companyLogo: e.target.value})}
                    placeholder="https://example.com/logo.png"
                    className="w-full p-3 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="edit-company-desc" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Bio</label>
                  <textarea 
                    id="edit-company-desc"
                    value={formData.companyDescription || ''}
                    onChange={(e) => setFormData({...formData, companyDescription: e.target.value})}
                    placeholder="Tell us about the company..."
                    className="w-full h-24 p-3 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white resize-none"
                  />
                </div>
              </>
            )}
            <button 
              type="submit" 
              className="w-full py-3 bg-skope-navy dark:bg-skope-blue text-white font-bold rounded-xl hover:bg-skope-deep dark:hover:bg-skope-navy transition-all focus-visible:ring-4 focus-visible:ring-skope-blue outline-none"
              aria-label="Save changes"
            >
              Save Changes
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-skope-light dark:bg-skope-deep rounded-2xl flex items-center justify-center text-skope-navy dark:text-skope-light overflow-hidden border-2 border-white dark:border-skope-steel shadow-sm">
                {profile.role === 'recruiter' ? (
                  profile.companyLogo ? (
                    <img src={profile.companyLogo} alt={profile.companyName} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <Briefcase className="w-10 h-10" />
                  )
                ) : (
                  profile.photoURL ? (
                    <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-10 h-10" />
                  )
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-skope-dark dark:text-white">
                  {profile.role === 'recruiter' ? (profile.companyName || profile.displayName) : profile.displayName}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">{profile.email}</p>
                {profile.role === 'recruiter' && <span className="text-[10px] font-black uppercase tracking-widest bg-skope-navy dark:bg-skope-blue text-white px-2 py-0.5 rounded-full mt-1 inline-block">Recruiter / Employer</span>}
              </div>
            </div>

            {profile.role === 'student' && profile.bio && (
              <div className="bg-skope-light/10 dark:bg-skope-deep p-6 rounded-3xl border border-skope-light dark:border-skope-steel">
                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold mb-2">About Me</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {profile.role === 'recruiter' && (
              <div className="bg-skope-light/10 dark:bg-skope-deep p-6 rounded-3xl border border-skope-light dark:border-skope-steel">
                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold mb-2">Company Bio</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{profile.companyDescription || 'No company bio provided.'}</p>
              </div>
            )}
            
            {profile.role === 'student' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-skope-light/10 dark:bg-skope-deep p-4 rounded-2xl">
                  <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold mb-1">Birthday</p>
                  <p className="text-slate-900 dark:text-white font-medium">{profile.birthday || 'Not set'}</p>
                </div>
                <div className="bg-skope-light/10 dark:bg-skope-deep p-4 rounded-2xl">
                  <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold mb-1">Age</p>
                  <p className="text-slate-900 dark:text-white font-medium">{profile.age || 'Not set'}</p>
                </div>
                <div className="bg-skope-light/10 dark:bg-skope-deep p-4 rounded-2xl">
                  <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold mb-1">Location</p>
                  <p className="text-slate-900 dark:text-white font-medium">{profile.location || 'Not set'}</p>
                </div>
                <div className="bg-skope-light/10 dark:bg-skope-deep p-4 rounded-2xl">
                  <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold mb-1">Phone</p>
                  <p className="text-slate-900 dark:text-white font-medium">{profile.phone || 'Not set'}</p>
                </div>
              </div>
            )}

            {/* Badges Section */}
            {profile.role === 'student' && (
              <div className="pt-6 border-t border-skope-light dark:border-skope-steel">
                <h4 className="text-sm font-black text-skope-dark dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Medal className="w-4 h-4 text-skope-navy dark:text-skope-blue" />
                  Earned Badges
                </h4>
                {profile.badges && profile.badges.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {profile.badges.map((badge) => (
                      <div key={badge.id} className="flex items-center gap-3 p-3 bg-skope-light/10 dark:bg-skope-deep border border-skope-light dark:border-skope-steel rounded-2xl">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${badge.color}20` }}>
                          <Medal className="w-4 h-4" style={{ color: badge.color }} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[10px] font-black text-skope-dark dark:text-white truncate">{badge.title}</p>
                          <p className="text-[8px] text-slate-400">Earned!</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 dark:bg-skope-deep/20 rounded-2xl border border-dashed border-slate-200 dark:border-skope-steel text-center">
                    <p className="text-xs text-slate-400">No badges earned yet. Complete roadmap steps to earn them!</p>
                  </div>
                )}
              </div>
            )}

            {profile.role === 'student' && (
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold mb-1">Desired Roles</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.desiredJobs?.map((job, i) => (
                    <span key={i} className="px-3 py-1 bg-skope-light dark:bg-skope-deep text-skope-navy dark:text-skope-blue rounded-full text-sm font-medium">
                      {job}
                    </span>
                  )) || <p className="text-slate-400 dark:text-slate-500 italic">No roles specified.</p>}
                </div>
              </div>
            )}
            {/* Accessibility Settings */}
            <div className="pt-6 border-t border-slate-100 dark:border-skope-steel space-y-6">
              <h4 className="text-sm font-black text-skope-dark dark:text-white uppercase tracking-widest flex items-center gap-2">
                <Accessibility className="w-4 h-4 text-skope-navy dark:text-skope-blue" />
                Accessibility & Appearance
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Color Filters & Saturation</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'none', label: 'Default' },
                      { id: 'grayscale', label: 'Grayscale' },
                      { id: 'high-contrast', label: 'High Contrast' },
                      { id: 'protanopia', label: 'Protanopia' },
                      { id: 'deuteranopia', label: 'Deuteranopia' },
                      { id: 'tritanopia', label: 'Tritanopia' }
                    ].map(filter => (
                      <button
                        key={filter.id}
                        onClick={() => setAccFilter(filter.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                          accFilter === filter.id 
                            ? 'bg-skope-navy dark:bg-skope-blue text-white border-transparent shadow-md' 
                            : 'bg-white dark:bg-skope-dark text-slate-600 dark:text-slate-400 border-slate-200 dark:border-skope-steel hover:border-skope-blue'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Text Boldness</p>
                  <div className="flex gap-2">
                    {['normal', 'bold', 'extra-bold'].map(b => (
                      <button
                        key={b}
                        onClick={() => {
                          localStorage.setItem('skope_boldness', b);
                          window.location.reload(); // Reload to apply weight changes properly
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border capitalize ${
                          localStorage.getItem('skope_boldness') === b || (!localStorage.getItem('skope_boldness') && b === 'normal')
                            ? 'bg-skope-navy dark:bg-skope-blue text-white border-transparent shadow-md' 
                            : 'bg-white dark:bg-skope-dark text-slate-600 dark:text-slate-400 border-slate-200 dark:border-skope-steel hover:border-skope-blue'
                        }`}
                      >
                        {b.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-skope-steel">
              <button 
                onClick={() => signOut(auth)}
                className="w-full py-3 bg-slate-50 dark:bg-skope-deep/20 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-skope-deep transition-all flex items-center justify-center gap-2 focus-visible:ring-4 focus-visible:ring-skope-blue outline-none"
                aria-label="Sign out"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>

            {/* Account Management & Help Section */}
            <div className="pt-12 border-t border-slate-100 dark:border-skope-steel space-y-8">
              <section>
                <h4 className="text-sm font-black text-skope-dark dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-skope-navy dark:text-skope-blue" />
                  Help & Documentation
                </h4>
                <div className="bg-slate-50 dark:bg-skope-deep/20 p-6 rounded-3xl border border-slate-100 dark:border-skope-steel">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-skope-dark dark:text-white">Privacy Policy</p>
                      <p className="text-xs text-slate-500">Read about our student research and data storage.</p>
                    </div>
                    <button 
                      onClick={onShowPrivacy}
                      className="px-4 py-2 bg-white dark:bg-skope-dark border border-skope-sky dark:border-skope-steel text-skope-navy dark:text-skope-blue text-xs font-bold rounded-xl hover:bg-skope-light transition-all"
                    >
                      View Policy
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Withdrawal
                </h4>
                
                <div className="p-6 rounded-3xl border border-dashed border-slate-200 dark:border-skope-steel">
                  <h5 className="font-bold text-slate-700 dark:text-slate-200 mb-2">Leave Skope</h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                    By deleting your profile, you withdraw your participation from our student research. Your personal data and results will be permanently removed.
                  </p>
                  <DeleteAccountButton userId={profile.uid} />
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DeleteAccountButton = ({ userId }: { userId: string }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // 1. Delete Firestore user document
      await deleteDoc(doc(db, 'users', userId));
      // In a production app, you'd also delete relevant subcollections here
      
      // 2. Clear user state and sign out
      await signOut(auth);
      window.location.reload(); // Force a clean slate
    } catch (error: any) {
      console.error("Delete failed:", error);
      alert("Failed to delete account. Please ensure you have a stable connection and try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative">
      {!isConfirming ? (
        <button 
          onClick={() => setIsConfirming(true)}
          className="px-6 py-3 bg-white dark:bg-skope-dark border border-slate-200 dark:border-skope-steel text-slate-500 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 transition-all text-xs font-bold rounded-xl flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col sm:flex-row items-center gap-4 py-2"
        >
          <p className="text-xs font-bold text-red-600 dark:text-red-400">Permanently delete metadata?</p>
          <div className="flex gap-2">
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-5 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Yes, Delete'}
            </button>
            <button 
              onClick={() => setIsConfirming(false)}
              disabled={isDeleting}
              className="px-5 py-2.5 bg-slate-100 dark:bg-skope-deep text-slate-600 dark:text-white text-xs font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const StudentView = ({ profile, activeTab, onViewProfile }: { profile: UserProfile, activeTab: string, onViewProfile: (uid: string) => void }) => {
  const [cvText, setCvText] = useState('');
  const [cvFile, setCvFile] = useState<FileData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [latestCV, setLatestCV] = useState<CV | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [newJob, setNewJob] = useState('');
  const [isUpdatingJobs, setIsUpdatingJobs] = useState(false);

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.trim() || isUpdatingJobs) return;
    
    setIsUpdatingJobs(true);
    try {
      const currentJobs = profile.desiredJobs || [];
      const normalizedNewJob = newJob.trim();
      const jobExists = currentJobs.some(j => j.toLowerCase() === normalizedNewJob.toLowerCase());
      
      if (!jobExists) {
        await updateDoc(doc(db, 'users', profile.uid), {
          desiredJobs: [...currentJobs, normalizedNewJob]
        });
        await completeRoadmapStep(profile.uid, 'career_paths_set');
        setNewJob('');
      } else {
        // Clear input anyway if it already exists to show it was "processed"
        setNewJob('');
      }
    } catch (error) {
      console.error("Failed to add job", error);
    } finally {
      setIsUpdatingJobs(false);
    }
  };

  const handleRemoveJob = async (jobToRemove: string) => {
    if (isUpdatingJobs) return;
    setIsUpdatingJobs(true);
    try {
      const currentJobs = profile.desiredJobs || [];
      const updatedJobs = currentJobs.filter(j => j !== jobToRemove);
      
      await updateDoc(doc(db, 'users', profile.uid), {
        desiredJobs: updatedJobs
      });
      console.log(`Successfully removed job: ${jobToRemove}`);
    } catch (error) {
      console.error("Failed to remove job", error);
    } finally {
      setIsUpdatingJobs(false);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, 'cvs'), 
      where('studentId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setLatestCV({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CV);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'cvs');
    });
    return unsubscribe;
  }, [profile.uid]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    // Convert to base64 for Gemini
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setCvFile({
        data: base64,
        mimeType: file.type || 'application/pdf'
      });
    };
    reader.readAsDataURL(file);

    if (file.type === 'application/pdf') {
      try {
        const typedarray = new Uint8Array(await file.arrayBuffer());
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => (item as any).str).join(' ');
          fullText += pageText + '\n';
        }
        setCvText(fullText);
      } catch (error) {
        console.error("PDF text extraction failed, but will use file for Gemini", error);
        // We don't alert here anymore because we'll send the file to Gemini anyway
      }
    } else {
      const textReader = new FileReader();
      textReader.onload = (event) => {
        setCvText(event.target?.result as string);
      };
      textReader.readAsText(file);
    }
  };

  const handleAnalyze = async () => {
    if (!cvText.trim() && !cvFile) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      // If we significantly successfully extracted text, we don't need to send the massive base64 file too,
      // as sending a 5MB base64 string AND the text can crash the Gemini API payload limits.
      const fileToSent = cvText.length < 50 ? cvFile : null;
      const result = await analyzeCV(cvText, fileToSent, profile.desiredJobs);
      
      if (result.atsScore === 0 && result.analysis.includes("failed")) {
        setAnalyzeError(result.analysis);
        return;
      }
      
      // Save to Firestore (excluding base64 file data to avoid 1MB document limit)
      await addDoc(collection(db, 'cvs'), {
        studentId: profile.uid,
        cvText: cvText,
        analysis: result.analysis,
        atsScore: result.atsScore,
        suggestedCourses: result.suggestedCourses,
        createdAt: new Date().toISOString()
      });
      await completeRoadmapStep(profile.uid, 'cv_analyzed');
    } catch (error: any) {
      console.error("Analysis failed", error);
      setAnalyzeError(error.message || "An unexpected error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (activeTab === 'roadmap') return (
    <div className="roadmap-container" style={{ fontSize: '18px' }}>
      <CareerRoadmap profile={profile} />
    </div>
  );
  if (activeTab === 'buddy') return <CareerBuddy profile={profile} onViewProfile={onViewProfile} />;
  if (activeTab === 'jobs') return <JobsList role="student" userId={profile.uid} profile={profile} onViewProfile={onViewProfile} />;
  if (activeTab === 'courses') return <CoursesView cv={latestCV} userId={profile.uid} />;

  return (
    <div className="space-y-8">
      <section className="bg-white dark:bg-skope-dark p-6 sm:p-8 rounded-3xl shadow-sm border border-skope-light dark:border-skope-steel">
        <h2 className="text-2xl font-bold text-skope-dark dark:text-white mb-2 flex items-center gap-2">
          <Target className="text-skope-navy dark:text-skope-blue" /> Desired Career Paths
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Tell us what roles you're aiming for. This helps Skope Buddy tailor advice and connects you with similar Career Buddies.</p>
        
        <form onSubmit={handleAddJob} className="flex gap-3 mb-6">
          <div className="flex-1 space-y-1">
            <label htmlFor="add-job" className="sr-only">Add Desired Job</label>
            <input 
              id="add-job"
              type="text"
              value={newJob}
              onChange={(e) => setNewJob(e.target.value)}
              placeholder="e.g. Frontend Developer, Product Manager..."
              className="w-full p-4 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-2xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white transition-all"
            />
          </div>
          <button 
            type="submit"
            disabled={isUpdatingJobs || !newJob.trim()}
            className="px-8 py-4 bg-skope-navy dark:bg-skope-blue text-white rounded-2xl font-bold hover:bg-skope-deep dark:hover:bg-skope-navy disabled:bg-slate-200 dark:disabled:bg-skope-deep transition-all focus-visible:ring-4 focus-visible:ring-skope-blue outline-none"
            aria-label="Add job role"
          >
            {isUpdatingJobs ? <Loader2 className="animate-spin w-5 h-5" /> : 'Add'}
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {profile.desiredJobs?.map((job, i) => (
            <span key={i} className="flex items-center gap-2 pl-4 pr-2 py-2 bg-skope-light dark:bg-skope-deep text-skope-navy dark:text-skope-light rounded-full text-sm font-bold border border-skope-sky dark:border-skope-steel group">
              {job}
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveJob(job);
                }}
                className="p-1 hover:bg-red-500 hover:text-white transition-all rounded-full outline-none focus-visible:ring-2 focus-visible:ring-skope-blue"
                aria-label={`Remove ${job}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {(!profile.desiredJobs || profile.desiredJobs.length === 0) && (
            <p className="text-slate-400 italic text-sm">No desired jobs added yet.</p>
          )}
        </div>
      </section>

      <section className="bg-white dark:bg-skope-dark p-6 sm:p-8 rounded-3xl shadow-sm border border-skope-light dark:border-skope-steel">
        <h2 className="text-2xl font-bold text-skope-dark dark:text-white mb-6 flex items-center gap-2">
          <Upload className="text-skope-navy dark:text-skope-blue" /> CV Analysis (2026)
        </h2>
        
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-skope-sky dark:border-skope-steel rounded-2xl p-8 bg-skope-light/10 dark:bg-skope-deep/20 hover:bg-skope-light/20 dark:hover:bg-skope-deep/30 transition-colors cursor-pointer relative group">
            <input 
              type="file" 
              accept=".pdf,.txt"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              aria-label="Upload CV (PDF or Text)"
            />
            <div className="w-12 h-12 bg-white dark:bg-skope-dark rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="text-skope-navy dark:text-skope-blue w-6 h-6" />
            </div>
            <p className="text-skope-dark dark:text-white font-semibold">{fileName || 'Upload your CV (PDF or TXT)'}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">or drag and drop here</p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-skope-light dark:border-skope-steel"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-skope-dark text-slate-500 dark:text-slate-400">OR PASTE TEXT</span>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="cv-text-input" className="sr-only">CV Text Content</label>
            <textarea 
              id="cv-text-input"
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Paste your CV content here..."
              className="w-full h-48 p-4 bg-skope-light/10 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-2xl focus:ring-2 focus:ring-skope-blue focus:border-transparent transition-all outline-none resize-none dark:text-white"
            />
          </div>
          
          {analyzeError && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <span className="font-bold block mb-1">Analysis Error</span>
              {analyzeError}
            </div>
          )}

          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || (!cvText.trim() && !cvFile)}
            className="w-full py-4 bg-skope-navy dark:bg-skope-blue hover:bg-skope-deep dark:hover:bg-skope-navy disabled:bg-slate-300 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-skope-light dark:shadow-none focus-visible:ring-4 focus-visible:ring-skope-blue outline-none"
            aria-label={isAnalyzing ? "Analyzing CV..." : "Analyze My CV"}
          >
            {isAnalyzing ? <Loader2 className="animate-spin" /> : <Upload className="w-5 h-5" />}
            {isAnalyzing ? 'Analyzing...' : 'Analyze My CV'}
          </button>
        </div>
      </section>

      <AnimatePresence>
        {latestCV && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="bg-white dark:bg-skope-dark p-8 rounded-3xl border border-skope-light dark:border-skope-steel flex flex-col items-center justify-center text-center shadow-sm">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">ATS Score</p>
                <CircularATSScore score={latestCV.atsScore} />
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-4 uppercase tracking-widest">Target: 80+</p>
              </div>
              <div className="md:col-span-3 bg-white dark:bg-skope-dark p-8 rounded-3xl border border-skope-light dark:border-skope-steel shadow-sm">
                <h3 className="text-xl font-bold text-skope-dark dark:text-white mb-6 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-skope-navy dark:text-skope-blue" />
                  AI Recommendations
                </h3>
                <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed text-justify">
                  <div className="markdown-body">
                    <Markdown>{latestCV.analysis}</Markdown>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

const CoursesView = ({ cv, userId }: { cv: CV | null, userId: string }) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!cv) {
    return (
      <div className="text-center py-20 bg-white dark:bg-skope-dark rounded-3xl border border-dashed border-skope-sky dark:border-skope-steel">
        <Plus className="w-12 h-12 text-skope-light dark:text-skope-steel mx-auto mb-4" />
        <h3 className="text-xl font-bold text-skope-dark dark:text-white mb-2">No Courses Yet</h3>
        <p className="text-slate-500 dark:text-slate-400">Analyze your CV first to get personalized course recommendations.</p>
      </div>
    );
  }

  const filteredCourses = cv.suggestedCourses.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.relevance.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Strengthen Your CV</h2>
          <p className="text-slate-500 dark:text-slate-400">Based on your CV analysis and desired roles, these certified courses will help you bridge the gap.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-3 w-full bg-white dark:bg-skope-dark border border-skope-light dark:border-skope-steel rounded-2xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCourses.length === 0 && <p className="text-slate-400 italic col-span-full">No courses found matching your search.</p>}
        {filteredCourses.map((course, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-skope-dark p-6 rounded-3xl shadow-sm border border-skope-light dark:border-skope-steel flex flex-col justify-between hover:shadow-xl transition-all"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-skope-light dark:bg-skope-deep text-skope-navy dark:text-skope-blue rounded-full text-xs font-bold uppercase tracking-wider">
                  {course.provider}
                </span>
              </div>
              <h3 className="text-xl font-bold text-skope-dark dark:text-white mb-2">{course.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 text-justify">{course.relevance}</p>
            </div>
            <a 
              href={course.url} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => completeRoadmapStep(userId, 'course_joined')}
              className="w-full py-3 bg-skope-navy dark:bg-skope-blue text-white text-center rounded-xl font-bold hover:bg-skope-deep dark:hover:bg-skope-navy transition-all flex items-center justify-center gap-2 focus-visible:ring-4 focus-visible:ring-skope-blue outline-none"
              aria-label={`View course: ${course.title} on ${course.provider}`}
            >
              View Course <ChevronRight className="w-4 h-4" />
            </a>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// --- Recruiter View ---

const ApplicantsView = ({ recruiterId, onViewProfile }: { recruiterId: string, onViewProfile: (uid: string) => void }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [filterKeyword, setFilterKeyword] = useState('');
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'jobs'), where('recruiterId', '==', recruiterId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
    });
    return unsubscribe;
  }, [recruiterId]);

  useEffect(() => {
    let q = query(collection(db, 'job_applications'));
    if (selectedJobId !== 'all') {
      q = query(collection(db, 'job_applications'), where('jobId', '==', selectedJobId));
    } else if (jobs.length > 0) {
      q = query(collection(db, 'job_applications'), where('jobId', 'in', jobs.map(j => j.id)));
    } else {
      setApplications([]);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobApplication)));
    });
    return unsubscribe;
  }, [selectedJobId, jobs]);

  const filteredApplications = applications.filter(app => 
    app.studentName.toLowerCase().includes(filterKeyword.toLowerCase()) ||
    app.status.toLowerCase().includes(filterKeyword.toLowerCase())
  );

  useEffect(() => {
    if (!selectedApp) return;
    const q = query(collection(db, 'job_applications', selectedApp.id, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChatMessages(snapshot.docs.map(doc => doc.data() as any));
    });

    // Mark as read
    const markAsRead = async () => {
      const appRef = doc(db, 'job_applications', selectedApp.id);
      const appDoc = await getDoc(appRef);
      if (appDoc.exists()) {
        const data = appDoc.data();
        if (data.unreadCount?.recruiter > 0) {
          await updateDoc(appRef, {
            'unreadCount.recruiter': 0
          });
        }
      }
    };
    markAsRead();

    return unsubscribe;
  }, [selectedApp]);

  const handleSendChat = async (text: string, type: 'text' | 'image' | 'file' = 'text', url?: string) => {
    if (!selectedApp) return;
    setIsTyping(true);

    try {
      const appRef = doc(db, 'job_applications', selectedApp.id);
      const appDoc = await getDoc(appRef);
      if (appDoc.exists()) {
        await updateDoc(appRef, {
          'unreadCount.student': (appDoc.data().unreadCount?.student || 0) + 1,
          lastMessage: type === 'text' ? text : `Sent a ${type}`,
          lastMessageAt: serverTimestamp()
        });
      }

      await addDoc(collection(db, 'job_applications', selectedApp.id, 'messages'), {
        role: 'recruiter',
        text,
        type,
        url: url || null,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Chat failed", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!selectedApp) return;
    setIsTyping(true);
    try {
      const fileRef = ref(storage, `applications/${selectedApp.id}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      await handleSendChat(file.name, type, url);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-skope-dark dark:text-white">Manage Applicants</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <select 
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="p-3 bg-white dark:bg-skope-dark border border-skope-light dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white text-sm"
          >
            <option value="all">All Jobs</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              placeholder="Filter by name or status..."
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              className="pl-10 pr-4 py-3 bg-white dark:bg-skope-dark border border-skope-light dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white text-sm w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`lg:col-span-1 space-y-4 ${selectedApp ? 'hidden lg:block' : 'block'}`}>
          {filteredApplications.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 italic p-8 bg-white dark:bg-skope-dark rounded-3xl border border-skope-light dark:border-skope-steel text-center">No applicants found.</p>
          ) : (
            filteredApplications.map(app => (
              <button 
                key={app.id}
                onClick={() => {
                  setSelectedApp(app);
                  setChatMessages([]);
                }}
                className={`w-full text-left p-6 rounded-3xl border transition-all ${
                  selectedApp?.id === app.id 
                    ? 'bg-skope-navy dark:bg-skope-blue border-transparent text-white shadow-xl' 
                    : 'bg-white dark:bg-skope-dark border-skope-light dark:border-skope-steel text-skope-dark dark:text-white hover:border-skope-blue'
                }`}
              >
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-skope-deep flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 dark:border-skope-steel">
                    {jobs.find(j => j.id === app.jobId)?.companyLogo ? (
                      <img src={jobs.find(j => j.id === app.jobId)?.companyLogo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <Briefcase className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg">{app.studentName}</h4>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewProfile(app.studentId);
                          }}
                          className={`p-1 rounded-lg transition-colors ${selectedApp?.id === app.id ? 'hover:bg-white/20' : 'hover:bg-slate-100 dark:hover:bg-skope-deep'}`}
                          title="View Profile"
                        >
                          <UserIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <span className={`text-[0.625rem] font-black uppercase px-2 py-1 rounded-md ${
                        app.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                        app.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                    <p className={`text-xs ${selectedApp?.id === app.id ? 'text-skope-sky' : 'text-slate-500'}`}>
                      Applied for: {jobs.find(j => j.id === app.jobId)?.title || 'Unknown Job'}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className={`lg:col-span-2 ${selectedApp ? 'block' : 'hidden lg:block'}`}>
          {selectedApp ? (
            <div className="bg-white dark:bg-skope-dark rounded-3xl border border-skope-light dark:border-skope-steel shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div className="p-4 sm:p-6 border-b border-skope-light dark:border-skope-steel flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-skope-deep/20">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedApp(null)}
                    className="lg:hidden p-2 hover:bg-slate-200 dark:hover:bg-skope-deep rounded-full transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 
                      className="text-xl font-bold text-skope-dark dark:text-white hover:text-skope-blue cursor-pointer transition-colors"
                      onClick={() => onViewProfile(selectedApp.studentId)}
                    >
                      {selectedApp.studentName}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Chatting about: {jobs.find(j => j.id === selectedApp.jobId)?.title}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-[0.625rem] font-bold text-slate-400 uppercase">Phone</p>
                    <p className="text-sm text-skope-dark dark:text-white">{selectedApp.studentPhone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.625rem] font-bold text-slate-400 uppercase">Email</p>
                    <p className="text-sm text-skope-dark dark:text-white">{selectedApp.studentEmail}</p>
                  </div>
                  <select 
                    value={selectedApp.status}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      await setDoc(doc(db, 'job_applications', selectedApp.id), { status: newStatus }, { merge: true });
                      if (newStatus === 'accepted') {
                        await completeRoadmapStep(selectedApp.studentId, 'offer_received');
                      }
                    }}
                    className="text-xs bg-white dark:bg-skope-dark border border-slate-200 dark:border-skope-steel rounded-lg p-2 outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-skope-dark/50">
                <div className="bg-skope-navy/5 dark:bg-skope-blue/5 border border-skope-navy/10 dark:border-skope-blue/10 p-4 rounded-2xl mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldAlert className="w-5 h-5 text-skope-navy dark:text-skope-blue" />
                    <h5 className="font-bold text-skope-dark dark:text-white text-sm">Professional Safe Space</h5>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Skope is a professional environment. Please maintain a safe and respectful space for all users. 
                    Any inappropriate behavior or harassment will result in immediate account suspension.
                  </p>
                </div>
                <div className="bg-slate-100 dark:bg-skope-deep/40 p-4 rounded-2xl mb-6">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Applicant CV Content</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap line-clamp-6 hover:line-clamp-none transition-all cursor-pointer">{selectedApp.cvText}</p>
                </div>
                {chatMessages.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-slate-400 dark:text-slate-500">Start a conversation with {selectedApp.studentName}.</p>
                  </div>
                )}
                {chatMessages.map((m, i) => (
                  <MessageBubble key={i} message={m} isOwn={m.role === 'recruiter'} />
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-skope-light/20 dark:bg-skope-deep p-4 rounded-2xl animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400 dark:text-slate-500" />
                    </div>
                  </div>
                )}
              </div>

              <ChatInput onSend={(text) => handleSendChat(text)} />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-white dark:bg-skope-dark rounded-3xl border border-dashed border-skope-sky dark:border-skope-steel text-center">
              <Users className="w-16 h-16 text-skope-light dark:text-skope-steel mb-4" />
              <h3 className="text-xl font-bold text-skope-dark dark:text-white mb-2">Select an Applicant</h3>
              <p className="text-slate-500 dark:text-slate-400">Choose an applicant from the list to view details and start chatting.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Recruiter View ---

const RecruiterView = ({ profile, activeTab, onViewProfile }: { profile: UserProfile, activeTab: string, onViewProfile: (uid: string) => void }) => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState(profile.companyName || '');
  const [location, setLocation] = useState(profile.location || '');
  const [description, setDescription] = useState('');
  const [applicationLink, setApplicationLink] = useState('');
  const [jobLogo, setJobLogo] = useState(profile.companyLogo || '');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (profile.companyName) setCompany(profile.companyName);
    if (profile.location) setLocation(profile.location);
    if (profile.companyLogo) setJobLogo(profile.companyLogo);
  }, [profile.companyName, profile.location, profile.companyLogo]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPosting(true);
    try {
      await addDoc(collection(db, 'jobs'), {
        recruiterId: profile.uid,
        title,
        company: company || profile.companyName || '',
        companyLogo: jobLogo || profile.companyLogo || '',
        location,
        description,
        applicationLink,
        createdAt: new Date().toISOString()
      });
      setTitle('');
      setDescription('');
      setApplicationLink('');
      setShowForm(false);
    } catch (error) {
      console.error("Posting failed", error);
    } finally {
      setIsPosting(false);
    }
  };

  if (activeTab === 'jobs') return <ApplicantsView recruiterId={profile.uid} onViewProfile={onViewProfile} />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-skope-dark dark:text-white uppercase tracking-tight">My Jobs</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-skope-navy dark:bg-skope-blue hover:bg-skope-deep dark:hover:bg-skope-navy text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-skope-light dark:shadow-none focus-visible:ring-4 focus-visible:ring-skope-blue outline-none"
          aria-label={showForm ? "Cancel posting" : "Post a new job"}
          aria-expanded={showForm}
        >
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showForm ? 'Cancel' : 'Post a Job'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handlePost}
            className="bg-white dark:bg-skope-dark p-8 rounded-3xl shadow-sm border border-skope-light dark:border-skope-steel space-y-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="job-title" className="sr-only">Job Title</label>
                <input 
                  id="job-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Job Title"
                  className="w-full p-4 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="company-name" className="sr-only">Company Name</label>
                <input 
                  id="company-name"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company Name"
                  className="w-full p-4 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="job-location" className="sr-only">Location</label>
                <input 
                  id="job-location"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location (e.g. Remote, Dubai, etc.)"
                  className="w-full p-4 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="job-description" className="sr-only">Job Description</label>
              <textarea 
                id="job-description"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Job Description"
                className="w-full h-32 p-4 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white resize-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="job-logo" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Job/Company Logo URL</label>
                <input 
                  id="job-logo"
                  value={jobLogo}
                  onChange={(e) => setJobLogo(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full p-4 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="app-link" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Application Link (Optional)</label>
                <input 
                  id="app-link"
                  value={applicationLink}
                  onChange={(e) => setApplicationLink(e.target.value)}
                  placeholder="https://example.com/apply"
                  className="w-full p-4 bg-skope-light/20 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium hover:bg-skope-light/20 dark:hover:bg-skope-deep rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-skope-blue outline-none"
                aria-label="Cancel job posting"
              >
                Cancel
              </button>
              <button 
                disabled={isPosting}
                className="px-8 py-3 bg-skope-navy dark:bg-skope-blue text-white font-bold rounded-xl hover:bg-skope-deep dark:hover:bg-skope-navy disabled:bg-slate-300 dark:disabled:bg-skope-deep transition-all flex items-center gap-2 focus-visible:ring-4 focus-visible:ring-skope-blue outline-none"
                aria-label={isPosting ? "Posting job..." : "Post Job"}
              >
                {isPosting && <Loader2 className="w-4 h-4 animate-spin" />}
                Post Job
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <JobsList role="recruiter" userId={profile.uid} onViewProfile={onViewProfile} />
    </div>
  );
};

// --- Interview Simulator ---

const InterviewSimulator = ({ job, userId, onBack }: { job: Job, userId: string, onBack: () => void }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Initial greeting
    const startInterview = async () => {
      setIsTyping(true);
      try {
        const response = await getInterviewResponse([], job.title, job.description);
        setMessages([{ role: 'ai', text: response }]);
      } catch (error) {
        console.error("Interview start failed", error);
      } finally {
        setIsTyping(false);
      }
    };
    startInterview();
  }, [job.title, job.description]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input;
    setInput('');
    const newMessages = [...messages, { role: 'user', text: userMsg }] as {role: 'user' | 'ai', text: string}[];
    setMessages(newMessages);
    setIsTyping(true);

    // Roadmap progress
    await completeRoadmapStep(userId, 'interview_prep');

    try {
      const response = await getInterviewResponse(newMessages, job.title, job.description);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      console.error("Interview response failed", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 bg-skope-dark dark:bg-black flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interview-title"
    >
      <div className="p-4 border-b border-skope-deep dark:border-skope-steel flex items-center justify-between bg-skope-dark dark:bg-black">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="text-slate-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-skope-blue outline-none rounded"
            aria-label="Exit interview simulator"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h3 id="interview-title" className="text-white font-bold">AI Interview Simulator</h3>
            <p className="text-xs text-slate-400">{job.title} at {job.company}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-xs font-bold animate-pulse" aria-live="polite">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          LIVE SIMULATION
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto w-full">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-5 rounded-3xl ${
              m.role === 'user' 
                ? 'bg-skope-navy dark:bg-skope-blue text-white rounded-tr-none shadow-lg shadow-skope-dark/50' 
                : 'bg-skope-deep dark:bg-skope-dark text-slate-100 rounded-tl-none border border-skope-steel'
            }`}>
              <div className="markdown-body">
                <Markdown>{m.text}</Markdown>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-skope-deep dark:bg-skope-dark p-5 rounded-3xl rounded-tl-none border border-skope-steel animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-skope-dark dark:bg-black border-t border-skope-deep dark:border-skope-steel">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-3">
          <div className="flex-1 space-y-1">
            <label htmlFor="interview-input" className="sr-only">Your Answer</label>
            <input 
              id="interview-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your answer..."
              className="w-full p-4 bg-skope-deep dark:bg-skope-dark border border-skope-steel text-white rounded-2xl outline-none focus:ring-2 focus:ring-skope-blue transition-all"
            />
          </div>
          <button 
            disabled={isTyping || !input.trim()}
            className="p-4 bg-skope-navy dark:bg-skope-blue text-white rounded-2xl hover:bg-skope-deep dark:hover:bg-skope-navy disabled:bg-slate-700 dark:disabled:bg-skope-deep transition-all shadow-lg shadow-skope-dark/50 focus-visible:ring-4 focus-visible:ring-skope-blue outline-none"
            aria-label="Send answer"
          >
            <Send className="w-6 h-6" />
          </button>
        </form>
        <p className="text-center text-slate-500 text-[0.625rem] mt-4 uppercase tracking-widest font-bold">
          Powered by Skope AI • Professional Interview Mode
        </p>
      </div>
    </motion.div>
  );
};

// --- Shared Views ---

const JobsList = ({ role, userId, profile, onViewProfile }: { role: UserRole, userId?: string, profile?: UserProfile, onViewProfile: (uid: string) => void }) => {
  const [view, setView] = useState<'browse' | 'applications'>('browse');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isApplying, setIsApplying] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [latestCV, setLatestCV] = useState<CV | null>(null);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyFormData, setApplyFormData] = useState({
    name: '',
    phone: '',
    email: '',
    cvText: ''
  });

  useEffect(() => {
    if (role === 'student' && userId) {
      const q = query(
        collection(db, 'cvs'), 
        where('studentId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const cv = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CV;
          setLatestCV(cv);
          setApplyFormData(prev => ({ ...prev, cvText: cv.cvText }));
        }
      });
      return unsubscribe;
    }
  }, [userId, role]);

  useEffect(() => {
    if (userId) {
      const fetchProfile = async () => {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setApplyFormData(prev => ({
            ...prev,
            name: userData.displayName || '',
            phone: userData.phone || '',
            email: userData.email || ''
          }));
        }
      };
      fetchProfile();
    }
  }, [userId]);

  useEffect(() => {
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
      if (role === 'recruiter' && userId) {
        setJobs(jobsData.filter(j => j.recruiterId === userId));
      } else {
        setJobs(jobsData);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [role, userId]);

  useEffect(() => {
    if (userId) {
      const q = role === 'student' 
        ? query(collection(db, 'job_applications'), where('studentId', '==', userId))
        : query(collection(db, 'job_applications'), where('jobId', 'in', jobs.map(j => j.id).length > 0 ? jobs.map(j => j.id) : ['none']));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobApplication)));
      });
      return unsubscribe;
    }
  }, [userId, role, jobs]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || isApplying || !selectedJob) return;
    setIsApplying(selectedJob.id);
    try {
      await addDoc(collection(db, 'job_applications'), {
        jobId: selectedJob.id,
        recruiterId: selectedJob.recruiterId,
        studentId: userId,
        studentName: applyFormData.name,
        studentPhone: applyFormData.phone,
        studentEmail: applyFormData.email,
        cvText: applyFormData.cvText,
        status: 'pending',
        createdAt: new Date().toISOString(),
        unreadCount: { student: 0, recruiter: 1 }
      });
      
      // Roadmap progress
      await completeRoadmapStep(userId, 'first_job_applied');
      
      // Check for multiple applications
      const q = query(collection(db, 'job_applications'), where('studentId', '==', userId));
      const snap = await getDocs(q);
      if (snap.size >= 3) {
        await completeRoadmapStep(userId, 'multiple_jobs_applied');
      }

      setShowApplyForm(false);
    } catch (error) {
      console.error("Application failed", error);
    } finally {
      setIsApplying(null);
    }
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'jobs', editingJob.id), {
        title: editingJob.title,
        company: editingJob.company,
        location: editingJob.location,
        description: editingJob.description,
        applicationLink: editingJob.applicationLink || '',
        companyLogo: editingJob.companyLogo || ''
      });
      setEditingJob(null);
    } catch (error) {
      console.error("Failed to update job", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCheckMatch = async () => {
    if (!latestCV || !selectedJob) return;
    setIsMatching(true);
    try {
      const result = await analyzeJobMatch(latestCV.cvText, null, selectedJob.title, selectedJob.description);
      setMatchResult(result);
    } catch (error) {
      console.error("Match analysis failed", error);
    } finally {
      setIsMatching(false);
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    job.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="flex justify-center p-12 bg-white dark:bg-skope-dark rounded-3xl"><Loader2 className="animate-spin text-slate-300 dark:text-slate-600" /></div>;

  if (showInterview && selectedJob) {
    return <InterviewSimulator job={selectedJob} userId={userId} onBack={() => setShowInterview(false)} />;
  }

  if (role === 'student' && view === 'applications' && profile) {
    return (
      <div className="space-y-6">
        <div className="flex bg-white dark:bg-skope-dark p-1 rounded-2xl border border-skope-light dark:border-skope-steel w-fit">
          <button 
            onClick={() => setView('browse')}
            className="px-6 py-2 rounded-xl text-sm font-bold transition-all text-slate-500 hover:text-skope-navy dark:hover:text-white"
          >
            Browse Jobs
          </button>
          <button 
            className="px-6 py-2 rounded-xl text-sm font-bold transition-all bg-skope-navy dark:bg-skope-blue text-white shadow-md"
          >
            My Applications
          </button>
        </div>
        <StudentJobChat profile={profile} onViewProfile={onViewProfile} />
      </div>
    );
  }

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job? This will also delete all associated applications.')) return;
    
    try {
      // Delete the job
      await deleteDoc(doc(db, 'jobs', jobId));
      
      // Delete associated applications
      const appsQuery = query(collection(db, 'job_applications'), where('jobId', '==', jobId));
      const appsSnapshot = await onSnapshot(appsQuery, (snapshot) => {
        snapshot.docs.forEach(async (appDoc) => {
          await deleteDoc(doc(db, 'job_applications', appDoc.id));
        });
      });
    } catch (error) {
      console.error("Failed to delete job", error);
    }
  };

  if (selectedJob) {
    const application = applications.find(a => a.jobId === selectedJob.id && a.studentId === userId);
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-skope-dark p-8 rounded-3xl shadow-sm border border-skope-light dark:border-skope-steel max-w-3xl mx-auto"
      >
        <button 
          onClick={() => {
            setSelectedJob(null);
            setMatchResult(null);
          }}
          className="mb-6 flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-skope-dark dark:hover:text-white transition-colors font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Jobs
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="text-3xl font-black text-skope-dark dark:text-white mb-2">{selectedJob.title}</h3>
            <div className="flex items-center gap-3">
              <p 
                className="text-xl text-skope-navy dark:text-skope-blue font-bold hover:underline cursor-pointer"
                onClick={() => onViewProfile(selectedJob.recruiterId)}
              >
                {selectedJob.company}
              </p>
              {selectedJob.location && (
                <>
                  <span className="text-slate-300 dark:text-skope-steel text-xl">•</span>
                  <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">{selectedJob.location}</p>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowInterview(true)}
              className="flex items-center gap-2 px-6 py-3 bg-skope-dark dark:bg-skope-blue text-white rounded-2xl font-bold hover:bg-skope-deep dark:hover:bg-skope-navy transition-all shadow-lg shadow-skope-light dark:shadow-none"
            >
              <Mic className="w-5 h-5" /> Practice Interview
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-8 mb-8">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <h4 className="text-lg font-bold text-skope-dark dark:text-white mb-4 flex items-center gap-2">
              <FileText className="text-skope-navy dark:text-skope-blue w-5 h-5" /> Job Description
            </h4>
            <div className="bg-slate-50 dark:bg-skope-deep/10 p-6 rounded-3xl border border-skope-light dark:border-skope-steel">
              <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed text-sm text-justify">{selectedJob.description}</p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {role === 'student' && (
              <div className="bg-skope-light/10 dark:bg-skope-deep/20 p-6 rounded-3xl border border-skope-light dark:border-skope-steel w-full">
                <h4 className="text-sm font-bold text-skope-dark dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Target className="text-skope-navy dark:text-skope-blue w-4 h-4" /> CV Match
                </h4>
                
                {!latestCV ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">Upload your CV in the Analysis tab to check compatibility.</p>
                ) : matchResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Compatibility</span>
                      <span className={`text-2xl font-black ${matchResult.score > 70 ? 'text-green-600' : matchResult.score > 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {matchResult.score}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-skope-deep h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${matchResult.score > 70 ? 'bg-green-500' : matchResult.score > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${matchResult.score}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 markdown-body mt-2 text-justify">
                      <Markdown>{matchResult.analysis}</Markdown>
                    </div>
                    <div className="pt-4 border-t border-slate-200 dark:border-skope-steel grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div>
                        <p className="text-[0.625rem] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">CV Tailoring Strategy</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic mb-4 text-justify">
                          {matchResult.tailoringStrategy}
                        </p>
                      </div>

                      <div>
                        <p className="text-[0.625rem] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Cover Letter Tips</p>
                        <ul className="space-y-2">
                          {matchResult.coverLetterTips.map((tip, i) => (
                            <li key={i} className="text-xs text-blue-600 dark:text-skope-sky flex gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-[0.625rem] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Quick Improvement Tips</p>
                        <ul className="space-y-2">
                          {matchResult.tips.map((tip, i) => (
                            <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex gap-2">
                              <CheckCircle2 className="w-3 h-3 text-green-500 dark:text-green-400 shrink-0 mt-0.5" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={handleCheckMatch}
                    disabled={isMatching}
                    className="w-full py-3 bg-white dark:bg-skope-dark border border-skope-sky dark:border-skope-steel text-skope-navy dark:text-skope-blue rounded-xl font-bold hover:bg-skope-light dark:hover:bg-skope-deep transition-all flex items-center justify-center gap-2"
                  >
                    {isMatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                    {isMatching ? 'Analyzing...' : 'Check CV Match'}
                  </button>
                )}
              </div>
            )}

            {selectedJob.applicationLink && (
              <div className="p-6 bg-blue-50 dark:bg-skope-deep/20 rounded-3xl border border-blue-100 dark:border-skope-steel w-full">
                <h4 className="text-xs font-bold text-blue-900 dark:text-skope-blue uppercase tracking-wider mb-2">External Link</h4>
                <a 
                  href={selectedJob.applicationLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-skope-sky font-bold hover:underline break-all text-xs flex items-center gap-2"
                >
                  <ExternalLink className="w-3 h-3" /> Visit Website
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-8 border-t border-skope-light dark:border-skope-steel">
          {application ? (
            <div className="text-center p-6 bg-skope-light/10 dark:bg-skope-deep/20 rounded-3xl border border-skope-light dark:border-skope-steel">
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-1 font-medium">Application Status</p>
              <span className={`text-2xl font-black capitalize ${
                application.status === 'accepted' ? 'text-green-600' :
                application.status === 'rejected' ? 'text-red-600' :
                'text-skope-navy dark:text-skope-blue'
              }`}>
                {application.status}
              </span>
            </div>
          ) : showApplyForm ? (
            <form onSubmit={handleApply} className="space-y-4 bg-slate-50 dark:bg-skope-deep/10 p-6 rounded-3xl border border-skope-light dark:border-skope-steel">
              <h4 className="font-bold text-skope-dark dark:text-white mb-4">Internal Application Form</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                  <input 
                    required
                    value={applyFormData.name}
                    onChange={(e) => setApplyFormData({...applyFormData, name: e.target.value})}
                    className="w-full p-3 bg-white dark:bg-skope-dark border border-skope-light dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Phone Number</label>
                  <input 
                    required
                    value={applyFormData.phone}
                    onChange={(e) => setApplyFormData({...applyFormData, phone: e.target.value})}
                    className="w-full p-3 bg-white dark:bg-skope-dark border border-skope-light dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white text-sm"
                  />
                </div>
                <div className="space-y-1 col-span-full">
                  <label className="text-xs font-bold text-slate-400 uppercase">Email Address</label>
                  <input 
                    required
                    type="email"
                    value={applyFormData.email}
                    onChange={(e) => setApplyFormData({...applyFormData, email: e.target.value})}
                    className="w-full p-3 bg-white dark:bg-skope-dark border border-skope-light dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white text-sm"
                  />
                </div>
                <div className="space-y-1 col-span-full">
                  <label className="text-xs font-bold text-slate-400 uppercase">CV Content / Cover Letter</label>
                  <textarea 
                    required
                    value={applyFormData.cvText}
                    onChange={(e) => setApplyFormData({...applyFormData, cvText: e.target.value})}
                    placeholder="Paste your CV or write a short introduction..."
                    className="w-full h-32 p-3 bg-white dark:bg-skope-dark border border-skope-light dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white text-sm resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowApplyForm(false)}
                  className="flex-1 py-3 bg-slate-200 dark:bg-skope-steel text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!!isApplying}
                  className="flex-[2] py-3 bg-skope-navy dark:bg-skope-blue text-white rounded-xl font-black hover:bg-skope-deep dark:hover:bg-skope-navy transition-all flex items-center justify-center gap-2"
                >
                  {isApplying === selectedJob.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm & Submit
                </button>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => setShowApplyForm(true)}
              className="w-full py-4 bg-skope-navy dark:bg-skope-blue text-white rounded-2xl font-black hover:bg-skope-deep dark:hover:bg-skope-navy transition-all flex items-center justify-center gap-2 shadow-lg shadow-skope-light dark:shadow-none"
            >
              Submit Internal Application
            </button>
          )}
          
          {selectedJob.applicationLink && (
            <a 
              href={selectedJob.applicationLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-skope-dark dark:bg-skope-steel text-white rounded-2xl font-black hover:bg-skope-deep dark:hover:bg-skope-navy transition-all text-center"
            >
              Apply on Company Website
            </a>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {role === 'student' && (
        <div className="flex bg-white dark:bg-skope-dark p-1 rounded-2xl border border-skope-light dark:border-skope-steel w-fit mb-4">
          <button 
            className="px-6 py-2 rounded-xl text-sm font-bold transition-all bg-skope-navy dark:bg-skope-blue text-white shadow-md"
          >
            Browse Jobs
          </button>
          <button 
            onClick={() => setView('applications')}
            className="px-6 py-2 rounded-xl text-sm font-bold transition-all text-slate-500 hover:text-skope-navy dark:hover:text-white"
          >
            My Applications
          </button>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-skope-dark dark:text-white">
            {role === 'recruiter' ? 'Your Job Postings' : 'Available Opportunities'}
          </h3>
          {role === 'recruiter' && (
            <div className="flex gap-2">
              {filteredJobs.length > 0 && (
                <button 
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete ALL your job postings and their applications?')) {
                      for (const job of filteredJobs) {
                        await handleDeleteJob(job.id);
                      }
                    }
                  }}
                  className="text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-1 px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded-lg transition-all"
                >
                  <Trash2 className="w-3 h-3" /> Clear My Jobs
                </button>
              )}
              <button 
                onClick={async () => {
                  if (window.confirm('CRITICAL: Are you sure you want to delete EVERY job posting in the entire database? This cannot be undone.')) {
                    try {
                      const q = query(collection(db, 'jobs'));
                      const snapshot = await getDocs(q);
                      
                      for (const jobDoc of snapshot.docs) {
                        await deleteDoc(doc(db, 'jobs', jobDoc.id));
                        // Also delete applications for this job
                        const appsQ = query(collection(db, 'job_applications'), where('jobId', '==', jobDoc.id));
                        const appsSnapshot = await getDocs(appsQ);
                        for (const appDoc of appsSnapshot.docs) {
                          await deleteDoc(doc(db, 'job_applications', appDoc.id));
                        }
                      }
                    } catch (error) {
                      console.error("Global reset failed", error);
                    }
                  }
                }}
                className="text-xs text-slate-500 hover:text-red-600 font-bold flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-skope-deep rounded-lg transition-all"
              >
                <AlertCircle className="w-3 h-3" /> Global Reset
              </button>
            </div>
          )}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            placeholder="Search jobs or companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full bg-white dark:bg-skope-dark border border-skope-light dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white text-sm"
          />
        </div>
      </div>
      {filteredJobs.length === 0 && <p className="text-slate-400 dark:text-slate-500 italic">No jobs found.</p>}
      
      <AnimatePresence>
        {editingJob && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-skope-dark w-full max-w-2xl rounded-3xl shadow-2xl border border-skope-light dark:border-skope-steel overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-skope-light dark:border-skope-steel flex items-center justify-between bg-slate-50 dark:bg-skope-deep/20">
                <h3 className="text-xl font-bold text-skope-dark dark:text-white">Edit Job Posting</h3>
                <button 
                  onClick={() => setEditingJob(null)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-skope-deep rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleUpdateJob} className="p-8 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Job Title</label>
                    <input 
                      required
                      value={editingJob.title}
                      onChange={(e) => setEditingJob({...editingJob, title: e.target.value})}
                      className="w-full p-4 bg-skope-light/10 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Company Name</label>
                    <input 
                      required
                      value={editingJob.company}
                      onChange={(e) => setEditingJob({...editingJob, company: e.target.value})}
                      className="w-full p-4 bg-skope-light/10 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Location</label>
                  <input 
                    required
                    value={editingJob.location}
                    onChange={(e) => setEditingJob({...editingJob, location: e.target.value})}
                    placeholder="e.g. Remote, Dubai"
                    className="w-full p-4 bg-skope-light/10 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Job Description</label>
                  <textarea 
                    required
                    value={editingJob.description}
                    onChange={(e) => setEditingJob({...editingJob, description: e.target.value})}
                    className="w-full h-40 p-4 bg-skope-light/10 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Company Logo URL</label>
                    <input 
                      value={editingJob.companyLogo || ''}
                      onChange={(e) => setEditingJob({...editingJob, companyLogo: e.target.value})}
                      placeholder="https://..."
                      className="w-full p-4 bg-skope-light/10 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Application Link</label>
                    <input 
                      value={editingJob.applicationLink || ''}
                      onChange={(e) => setEditingJob({...editingJob, applicationLink: e.target.value})}
                      placeholder="https://..."
                      className="w-full p-4 bg-skope-light/10 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingJob(null)}
                    className="px-8 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-skope-deep rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={isUpdating}
                    className="px-8 py-3 bg-skope-navy dark:bg-skope-blue text-white font-bold rounded-xl hover:bg-skope-deep dark:hover:bg-skope-navy transition-all flex items-center gap-2"
                  >
                    {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {filteredJobs.map(job => {
        const application = applications.find(a => a.jobId === job.id && (role === 'student' ? a.studentId === userId : true));
        const jobApplications = applications.filter(a => a.jobId === job.id);

        return (
          <div key={job.id} className="bg-white dark:bg-skope-dark p-6 rounded-2xl shadow-sm border border-skope-light dark:border-skope-steel hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="text-lg font-bold text-skope-dark dark:text-white">{job.title}</h4>
                <div className="flex items-center gap-2 text-sm">
                  <p 
                    className="text-skope-navy dark:text-skope-blue font-medium hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewProfile(job.recruiterId);
                    }}
                  >
                    {job.company}
                  </p>
                  {job.location && (
                    <>
                      <span className="text-slate-300 dark:text-skope-steel">•</span>
                      <span className="text-slate-500 dark:text-slate-400 text-xs">{job.location}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {role === 'recruiter' && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingJob(job);
                      }}
                      className="p-2 text-slate-400 hover:text-skope-blue hover:bg-skope-light dark:hover:bg-skope-deep rounded-lg transition-all"
                      title="Edit Job"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteJob(job.id);
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      title="Delete Job"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 text-sm">{job.description}</p>
            
            <div className="flex justify-between items-center">
              {role === 'student' ? (
                application ? (
                  <span className={`px-4 py-2 rounded-xl text-sm font-bold capitalize ${
                    application.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' :
                    application.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 text-red-600' :
                    'bg-skope-light dark:bg-skope-deep text-skope-navy dark:text-skope-blue'
                  }`}>
                    {application.status}
                  </span>
                ) : (
                  <button 
                    onClick={() => setSelectedJob(job)}
                    className="px-6 py-2 bg-skope-navy dark:bg-skope-blue text-white rounded-xl font-bold hover:bg-skope-deep dark:hover:bg-skope-navy transition-all flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-skope-blue outline-none"
                    aria-label={`Apply for ${job.title} at ${job.company}`}
                  >
                    Apply Now
                  </button>
                )
              ) : (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Users className="w-4 h-4" />
                  {jobApplications.length} Applications
                </div>
              )}
            </div>

            {role === 'recruiter' && jobApplications.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-50 dark:border-skope-steel space-y-2">
                <p className="text-[0.625rem] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Applicants</p>
                {jobApplications.map(app => (
                  <div key={app.id} className="flex justify-between items-center bg-slate-50 dark:bg-skope-deep p-3 rounded-xl">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{app.studentName}</span>
                    <div className="space-y-1">
                      <label htmlFor={`status-${app.id}`} className="sr-only">Application Status</label>
                      <select 
                        id={`status-${app.id}`}
                        value={app.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          await setDoc(doc(db, 'job_applications', app.id), { status: newStatus }, { merge: true });
                          if (newStatus === 'accepted') {
                            await completeRoadmapStep(app.studentId, 'offer_received');
                          }
                        }}
                        className="text-xs bg-white dark:bg-skope-dark border border-slate-200 dark:border-skope-steel rounded-lg p-1 outline-none focus:ring-2 focus:ring-skope-blue dark:text-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const ChatInput = ({ onSend, placeholder }: { onSend: (text: string) => void, placeholder?: string }) => {
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  return (
    <form onSubmit={handleSend} className="p-4 border-t border-skope-light dark:border-skope-steel flex gap-2 bg-white dark:bg-skope-dark">
      <input 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder || "Type a message..."}
        className="flex-1 p-4 bg-skope-light/10 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white text-sm"
      />
      <button className="p-4 bg-skope-navy dark:bg-skope-blue text-white rounded-xl hover:bg-skope-deep transition-all shadow-lg shadow-skope-light dark:shadow-none">
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
};

const MessageBubble = ({ message, isOwn, onProfileClick }: { message: any, isOwn: boolean, onProfileClick?: () => void }) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${isOwn ? 'bg-skope-navy dark:bg-skope-blue text-white rounded-tr-none' : 'bg-white dark:bg-skope-deep text-skope-dark dark:text-slate-200 rounded-tl-none border border-skope-light dark:border-skope-steel'}`}>
        {message.type === 'image' ? (
          <img src={message.url} alt="Shared image" className="rounded-xl max-w-full h-auto mb-2" referrerPolicy="no-referrer" />
        ) : message.type === 'file' ? (
          <a href={message.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-black/10 rounded-xl hover:bg-black/20 transition-all">
            <FileText className="w-6 h-6" />
            <div className="text-left overflow-hidden">
              <p className="text-sm font-bold truncate">{message.text}</p>
              <p className="text-[10px] opacity-60">Click to view document</p>
            </div>
          </a>
        ) : (
          <p className="text-sm leading-relaxed">{message.text}</p>
        )}
      </div>
    </div>
  );
};

const useUserProfile = (uid: string | undefined) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [uid]);

  return { profile, loading };
};

const ProfileModal = ({ userId, isOpen, onClose }: { userId: string | null, isOpen: boolean, onClose: () => void }) => {
  const { profile, loading } = useUserProfile(userId || undefined);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white dark:bg-skope-dark w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-skope-light dark:border-skope-steel"
          onClick={e => e.stopPropagation()}
        >
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-skope-blue" />
            </div>
          ) : profile ? (
            <div className="relative">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 rounded-full text-skope-dark dark:text-white transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="h-32 bg-gradient-to-r from-skope-navy to-skope-blue"></div>
              
              <div className="px-8 pb-8 -mt-12">
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-3xl border-4 border-white dark:border-skope-dark overflow-hidden bg-slate-100 dark:bg-skope-deep shadow-lg">
                    {profile.photoURL ? (
                      <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-skope-navy dark:bg-skope-blue text-white text-2xl font-black">
                        {profile.displayName?.[0] || 'U'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-black text-skope-dark dark:text-white tracking-tight">{profile.displayName}</h3>
                    <p className="text-skope-navy dark:text-skope-blue font-bold text-sm uppercase tracking-wider">{profile.role}</p>
                  </div>

                  {profile.bio && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">About</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{profile.bio}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {profile.location && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Location</p>
                        <p className="text-xs text-skope-dark dark:text-white font-medium">{profile.location}</p>
                      </div>
                    )}
                    {profile.companyName && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Company</p>
                        <p className="text-xs text-skope-dark dark:text-white font-medium">{profile.companyName}</p>
                      </div>
                    )}
                  </div>

                  {profile.role === 'student' && profile.badges && profile.badges.length > 0 && (
                    <div className="pt-4 border-t border-slate-100 dark:border-skope-steel">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Badges Earned</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.badges.map((badge: any) => (
                          <div key={badge.id} className="p-2 bg-slate-50 dark:bg-skope-deep rounded-xl border border-slate-100 dark:border-skope-steel flex items-center gap-2">
                            <Medal className="w-3 h-3 text-skope-blue" />
                            <span className="text-[10px] font-bold text-skope-dark dark:text-white">{badge.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 italic">Profile not found.</div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const BuddyChat = ({ profile, buddy, onBack, onViewProfile }: { profile: UserProfile, buddy: UserProfile, onBack: () => void, onViewProfile: (uid: string) => void }) => {
  const [messages, setMessages] = useState<{role: string, text: string, type?: string, url?: string}[]>([]);
  const chatId = [profile.uid, buddy.uid].sort().join('_');

  useEffect(() => {
    const q = query(collection(db, 'buddy_chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => doc.data() as any));
    });

    // Mark as read
    const markAsRead = async () => {
      const chatRef = doc(db, 'buddy_chats', chatId);
      const chatDoc = await getDoc(chatRef);
      if (chatDoc.exists()) {
        const data = chatDoc.data();
        const currentUnread = data.unreadCount?.[profile.uid] || 0;
        if (currentUnread > 0) {
          await updateDoc(chatRef, {
            [`unreadCount.${profile.uid}`]: 0
          });
        }
      }
    };
    markAsRead();

    return unsubscribe;
  }, [chatId, profile.uid]);

  const handleSend = async (text: string, type: 'text' | 'image' | 'file' = 'text', url?: string) => {
    try {
      const chatRef = doc(db, 'buddy_chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      // Roadmap progress
      await completeRoadmapStep(profile.uid, 'buddy_connected');
      
      // Check for multiple connections
      const buddyQ = query(collection(db, 'buddy_chats'), where('participants', 'array-contains', profile.uid));
      const buddySnap = await getDocs(buddyQ);
      if (buddySnap.size >= 3) {
        await completeRoadmapStep(profile.uid, 'network_growth');
      }
      
      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          participants: [profile.uid, buddy.uid],
          unreadCount: { [profile.uid]: 0, [buddy.uid]: 1 },
          lastMessage: type === 'text' ? text : `Sent a ${type}`,
          lastMessageAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
      } else {
        const currentUnread = chatDoc.data().unreadCount || {};
        await updateDoc(chatRef, {
          [`unreadCount.${buddy.uid}`]: (currentUnread[buddy.uid] || 0) + 1,
          lastMessage: type === 'text' ? text : `Sent a ${type}`,
          lastMessageAt: serverTimestamp()
        });
      }

      await addDoc(collection(db, 'buddy_chats', chatId, 'messages'), {
        role: profile.uid,
        text,
        type,
        url: url || null,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-skope-dark rounded-3xl border border-skope-light dark:border-skope-steel overflow-hidden shadow-xl">
      <div className="p-4 border-b border-skope-light dark:border-skope-steel flex items-center gap-4 bg-slate-50 dark:bg-skope-deep/20">
        <button onClick={onBack} className="p-2 hover:bg-slate-200 dark:hover:bg-skope-steel rounded-full transition-all text-slate-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-skope-navy dark:bg-skope-blue text-white rounded-xl flex items-center justify-center font-bold overflow-hidden">
            {buddy.photoURL ? <img src={buddy.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : buddy.displayName.charAt(0)}
          </div>
          <div>
            <h4 
              className="font-bold text-skope-dark dark:text-white leading-tight hover:text-skope-blue cursor-pointer transition-colors"
              onClick={() => onViewProfile(buddy.uid)}
            >
              {buddy.displayName}
            </h4>
            <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">Career Buddy</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-skope-dark/50">
        <div className="bg-skope-navy/5 dark:bg-skope-blue/5 border border-skope-navy/10 dark:border-skope-blue/10 p-4 rounded-2xl mb-6">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-5 h-5 text-skope-navy dark:text-skope-blue" />
            <h5 className="font-bold text-skope-dark dark:text-white text-sm">Professional Safe Space</h5>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Skope is a professional environment. Please maintain a safe and respectful space for all users. 
            Any inappropriate behavior or harassment will result in immediate account suspension.
          </p>
        </div>
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 dark:text-slate-500 text-sm italic">Start a conversation with {buddy.displayName}!</p>
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} isOwn={m.role === profile.uid} />
        ))}
      </div>
      <ChatInput onSend={(text) => handleSend(text)} />
    </div>
  );
};

const CareerBuddy = ({ profile, onViewProfile }: { profile: UserProfile, onViewProfile: (uid: string) => void }) => {
  const [buddies, setBuddies] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuddy, setSelectedBuddy] = useState<UserProfile | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const buddyQ = query(collection(db, 'buddy_chats'), where('participants', 'array-contains', profile.uid));
    const unsubscribe = onSnapshot(buddyQ, (snapshot) => {
      const counts: { [key: string]: number } = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const otherParticipant = data.participants.find((p: string) => p !== profile.uid);
        if (otherParticipant) {
          counts[otherParticipant] = data.unreadCount?.[profile.uid] || 0;
        }
      });
      setUnreadCounts(counts);
    });
    return unsubscribe;
  }, [profile.uid]);

  useEffect(() => {
    // Fuzzy match students by fetching a larger set and filtering client-side
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      limit(100)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allStudents = snapshot.docs.map(doc => doc.data() as UserProfile);
      const myJobs = profile.desiredJobs?.map(j => j.toLowerCase().trim()) || [];
      
      const matched = allStudents.filter(u => {
        if (u.uid === profile.uid) return false;
        const theirJobs = u.desiredJobs?.map(j => j.toLowerCase().trim()) || [];
        
        // Match if any of my jobs fuzzy-overlaps with any of theirs (handles casing and minor typos)
        return theirJobs.some(tj => 
          myJobs.some(mj => mj.includes(tj) || tj.includes(mj))
        );
      });
      
      setBuddies(matched.slice(0, 15));
    });
    return unsubscribe;
  }, [profile.uid, profile.desiredJobs]);

  const filteredBuddies = buddies.filter(buddy => 
    buddy.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    buddy.desiredJobs?.some(job => job.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (selectedBuddy) {
    return (
      <div className="h-[calc(100vh-200px)] max-w-4xl mx-auto">
        <BuddyChat profile={profile} buddy={selectedBuddy} onBack={() => setSelectedBuddy(null)} onViewProfile={onViewProfile} />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-skope-dark rounded-3xl shadow-sm border border-skope-light dark:border-skope-steel p-8 h-[calc(100vh-200px)] overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="text-2xl font-bold text-skope-dark dark:text-white mb-2 flex items-center gap-3">
              <Users className="text-skope-navy dark:text-skope-blue w-8 h-8" /> Career Buddy
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-lg">Connect with applicants who share your career interests and goals.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              placeholder="Search by name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 w-full bg-skope-light/10 dark:bg-skope-deep border border-skope-sky dark:border-skope-steel rounded-2xl outline-none focus:ring-2 focus:ring-skope-blue dark:text-white text-sm"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBuddies.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-skope-light/10 dark:bg-skope-deep/20 rounded-3xl border border-dashed border-skope-sky dark:border-skope-steel">
              <Users className="w-12 h-12 text-skope-light dark:text-skope-steel mx-auto mb-4" />
              <p className="text-slate-400 dark:text-slate-500 italic">No peers found matching your search.</p>
            </div>
          ) : (
            filteredBuddies.map((buddy, i) => (
              <div key={i} className="p-6 bg-white dark:bg-skope-dark rounded-3xl border border-skope-light dark:border-skope-steel shadow-sm hover:shadow-md hover:border-skope-sky dark:hover:border-skope-blue transition-all group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-skope-light dark:bg-skope-deep rounded-2xl flex items-center justify-center text-skope-navy dark:text-skope-blue font-bold text-xl group-hover:bg-skope-navy dark:group-hover:bg-skope-blue group-hover:text-white transition-colors">
                      {buddy.photoURL ? (
                        <img src={buddy.photoURL} alt={buddy.displayName} className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
                      ) : (
                        buddy.displayName.charAt(0)
                      )}
                    </div>
                    {unreadCounts[buddy.uid] > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-skope-dark">
                        {unreadCounts[buddy.uid]}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-skope-dark dark:text-white text-lg">{buddy.displayName}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{buddy.location || 'Global'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{buddy.bio || 'No bio provided.'}</p>
                  <div className="flex flex-wrap gap-2">
                    {buddy.desiredJobs?.map((job, j) => (
                      <span key={j} className="text-xs bg-skope-light/20 dark:bg-skope-deep px-3 py-1 rounded-full border border-skope-light dark:border-skope-steel text-skope-navy dark:text-skope-blue">
                        {job}
                      </span>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedBuddy(buddy)}
                  className="w-full mt-6 py-3 bg-skope-navy dark:bg-skope-blue text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-skope-navy/10 dark:shadow-none hover:shadow-xl hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-skope-blue outline-none"
                  aria-label={`Connect with ${buddy.displayName}`}
                >
                  <MessageSquare className="w-4 h-4" /> Connect
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
