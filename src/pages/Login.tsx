import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  ConfirmationResult,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, collection, addDoc, setDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, AlertCircle, Chrome, Fingerprint, Smartphone, CheckCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'credentials' | 'id'>('credentials');
  const [idStep, setIdStep] = useState(1);
  const [idNumber, setIdNumber] = useState('');
  const [verificationId, setVerificationId] = useState<ConfirmationResult | null>(null);
  const [otp, setOtp] = useState('');
  
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
    }
  };

  const onCredentialsSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Login Error:", err.code);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please check your credentials.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('CRITICAL: Email/Password login is not enabled in Firebase. Go to Firebase Console -> Authentication -> Sign-in method and enable "Email/Password".');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = (document.querySelector('input[type="email"]') as HTMLInputElement)?.value;
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const onIdLoginRequest = async () => {
    if (!idNumber) return;
    setLoading(true);
    setError(null);
    try {
      // Find user by ID Number
      const q = query(collection(db, 'users'), where('idNumber', '==', idNumber));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Identification number not registered. Please sign up first.');
      }
      
      const userData = querySnapshot.docs[0].data();
      let phoneNumber = userData.phoneNumber;

      if (!phoneNumber) {
        throw new Error('No mobile number is linked to this ID. Register with your phone number first.');
      }

      // Format for international auth
      if (!phoneNumber.startsWith('+')) {
         phoneNumber = `+${phoneNumber.replace(/^0+/, '')}`;
         if (phoneNumber.length < 10) throw new Error('Phone number format invalid. Use +[CountryCode][Number]');
      }

      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setVerificationId(confirmation);
      setIdStep(2);
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.code === 'auth/operation-not-allowed') {
         setError('CRITICAL: Authentication method not enabled. Please go to your Firebase Console -> Authentication -> Sign-in method and enable "Email/Password" and "Google".');
      } else if (err.code === 'auth/too-many-requests') {
         setError('Too many requests. Please wait a few minutes.');
      } else {
         setError(err.message || 'Login attempt failed. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const useAdminShortcut = () => {
    const adminEmail = 'kipkemoijared855@gmail.com';
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
    if (emailInput) {
       emailInput.value = adminEmail;
       setError("Admin ID matched. If you don't have a password yet, use the 'Google Workplace' button below to sign in with this email.");
    }
  };

  const devBypass = async (role: 'admin' | 'patient') => {
    // This is a dummy login for development if Firebase is not working
    console.log("Attempting Dev Bypass...");
    const dummyUser = {
      uid: role === 'admin' ? 'admin-123' : 'patient-123',
      email: role === 'admin' ? 'kipkemoijared855@gmail.com' : 'test@patient.com',
      displayName: role === 'admin' ? 'Admin User' : 'Test Patient'
    };
    
    try {
      // In a real app, this wouldn't work without actual auth. 
      // This is just a hint to the user.
      alert(`For testing: Log in with Google using ${dummyUser.email} to access the ${role} portal.`);
    } catch (e) {
      console.error(e);
    }
  };

  const onVerifyIdOtp = async () => {
    if (!verificationId) return;
    setLoading(true);
    try {
      await verificationId.confirm(otp);
      navigate('/dashboard');
    } catch (err: any) {
      setError('Invalid OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        const role = user.email === 'kipkemoijared855@gmail.com' ? 'admin' : 'patient';
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Google User',
          role: role,
          verified: true,
          createdAt: serverTimestamp(),
        });
      }
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-50">
      <div id="recaptcha-container"></div>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
         <button onClick={useAdminShortcut} className="px-4 py-2 bg-slate-800 text-white text-[10px] rounded-full font-bold shadow-lg">Admin Shortcut</button>
         <button onClick={() => alert('To install on Android: \n1. Open in Google Chrome \n2. Tap the ⋮ menu \n3. Select "Install app" or "Add to Home screen"')} className="px-4 py-2 bg-medical-primary text-white text-[10px] rounded-full font-bold shadow-lg transition-transform active:scale-95">Download Mobile App</button>
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100"
      >
        <div className="p-8 md:p-12">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-medical-primary rounded-2xl mb-4 shadow-lg shadow-medical-primary/20">
              <Activity className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-display font-bold text-slate-900">Welcome Back</h2>
            <div className="mt-4 flex p-1 bg-slate-100 rounded-xl w-full">
              <button 
                onClick={() => setLoginMode('credentials')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginMode === 'credentials' ? 'bg-white text-medical-primary shadow-sm' : 'text-slate-500'}`}
              >
                Standard Login
              </button>
              <button 
                onClick={() => setLoginMode('id')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginMode === 'id' ? 'bg-white text-medical-primary shadow-sm' : 'text-slate-500'}`}
              >
                ID Identification
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loginMode === 'credentials' ? (
              <motion.form 
                key="creds"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleSubmit(onCredentialsSubmit)} 
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input {...register('email')} type="email" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none" />
                    </div>
                    {errors.email && <span className="text-red-500 text-[10px] mt-1">{errors.email.message}</span>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Security Key</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input {...register('password')} type="password" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none" />
                    </div>
                    {errors.password && <span className="text-red-500 text-[10px] mt-1">{errors.password.message}</span>}
                    <div className="mt-2 text-right">
                      <button type="button" onClick={handleForgotPassword} className="text-[10px] font-bold text-medical-primary hover:underline">Forgot Password?</button>
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full btn-primary py-3.5 rounded-xl shadow-lg shadow-medical-primary/20">{loading ? 'Processing...' : 'Access Records'}</button>
                
                <div className="flex items-center before:content-[''] before:flex-1 before:border-b before:border-slate-100 after:content-[''] after:flex-1 after:border-b after:border-slate-100 text-slate-400 text-[10px] gap-4 uppercase font-bold tracking-[0.2em]">
                  Or social
                </div>

                <button onClick={signInWithGoogle} className="w-full flex items-center justify-center space-x-3 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-slate-700">
                  <Chrome className="h-5 w-5 text-medical-primary" />
                  <span>Google Workplace</span>
                </button>
              </motion.form>
            ) : (
              <motion.div 
                key="id-flow"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                {idStep === 1 ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Government / National ID</label>
                      <div className="relative">
                        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-medical-primary" />
                        <input 
                          value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value)}
                          placeholder="ID or Passport Number"
                          className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-bold outline-none focus:ring-2 focus:ring-medical-primary"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2">Verification code will be sent to your registered mobile number.</p>
                    </div>
                    <button onClick={onIdLoginRequest} disabled={loading || !idNumber} className="w-full btn-primary py-4 rounded-xl flex items-center justify-center gap-2">
                       <Smartphone className="h-5 w-5" />
                       {loading ? 'Verifying...' : 'Request Verification'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <button onClick={() => setIdStep(1)} className="flex items-center gap-1 text-xs font-bold text-medical-primary hover:underline">
                      <ArrowLeft className="h-3 w-3" /> Change ID
                    </button>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">SMS Verification Code</label>
                      <input 
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                        placeholder="000000"
                        className="w-full text-center text-4xl font-bold tracking-[0.5em] py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-medical-primary"
                      />
                    </div>
                    <button onClick={onVerifyIdOtp} disabled={loading || otp.length < 6} className="w-full btn-primary py-4 rounded-xl flex items-center justify-center gap-2">
                       <CheckCircle className="h-5 w-5" />
                       {loading ? 'Confirming...' : 'Complete Login'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="mt-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center space-x-2 text-red-600 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-medical-primary font-bold hover:underline">Create Account</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
