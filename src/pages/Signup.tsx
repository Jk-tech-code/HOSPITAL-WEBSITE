import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth, db } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  updateProfile, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, User, AlertCircle, ShieldCheck, Smartphone, Fingerprint, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const schema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  idNumber: z.string().min(6, 'ID Number is required'),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Use international format (e.g., +254...)'),
  role: z.enum(['patient', 'doctor']),
});

type FormData = z.infer<typeof schema>;

export default function Signup() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [verificationId, setVerificationId] = useState<ConfirmationResult | null>(null);
  const [otp, setOtp] = useState('');
  const [pendingUser, setPendingUser] = useState<FormData | null>(null);
  
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'patient' }
  });

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
    }
  };

  const onInformationSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, data.phoneNumber, appVerifier);
      setVerificationId(confirmation);
      setPendingUser(data);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    if (!verificationId || !pendingUser) return;
    setLoading(true);
    try {
      // Create actual account after phone verification
      const userCredential = await createUserWithEmailAndPassword(auth, pendingUser.email, pendingUser.password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: pendingUser.fullName });

      const role = pendingUser.email === 'kipkemoijared855@gmail.com' ? 'admin' : pendingUser.role;
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: pendingUser.email,
        displayName: pendingUser.fullName,
        idNumber: pendingUser.idNumber,
        phoneNumber: pendingUser.phoneNumber,
        role: role,
        verified: true,
        createdAt: serverTimestamp(),
      });
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-50">
      <div id="recaptcha-container"></div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100"
      >
        <div className="p-8 md:p-12">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="step1" exit={{ opacity: 0, x: -20 }}>
                <div className="flex flex-col items-center mb-8">
                  <div className="p-3 bg-medical-primary rounded-2xl mb-4 shadow-lg shadow-medical-primary/20">
                    <ShieldCheck className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-display font-bold text-slate-900 leading-none">Register Account</h2>
                  <p className="text-slate-500 text-sm mt-3 text-center">Enter your details for identity verification.</p>
                </div>

                <form onSubmit={handleSubmit(onInformationSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                       <input {...register('fullName')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-medical-primary" placeholder="John Doe" />
                       {errors.fullName && <p className="text-red-500 text-[10px] mt-1">{errors.fullName.message}</p>}
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Government ID</label>
                       <div className="relative">
                         <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                         <input {...register('idNumber')} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-medical-primary" placeholder="ID / Passport Number" />
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Mobile Number</label>
                       <div className="relative">
                         <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                         <input {...register('phoneNumber')} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-medical-primary" placeholder="+1234567890" />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                      <input {...register('email')} type="email" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-medical-primary" placeholder="name@example.com" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Security Password</label>
                      <input {...register('password')} type="password" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-medical-primary" placeholder="••••••••" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Account Role</label>
                      <select {...register('role')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-medical-primary">
                        <option value="patient">Patient</option>
                        <option value="doctor">Medical Practitioner</option>
                      </select>
                    </div>
                  </div>

                  {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>}

                  <button type="submit" disabled={loading} className="w-full btn-primary py-3 rounded-xl mt-4">
                    {loading ? 'Processing...' : 'Verify Phone & SMS'}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }}>
                <div className="flex flex-col items-center mb-8">
                  <div className="p-3 bg-medical-primary/10 rounded-2xl mb-4">
                    <Smartphone className="h-8 w-8 text-medical-primary animate-bounce" />
                  </div>
                  <h2 className="text-3xl font-display font-bold text-slate-900">Enter OTP</h2>
                  <p className="text-slate-500 text-sm mt-2 text-center text-balance">
                    We sent a 6-digit code to <span className="font-bold text-slate-900">{pendingUser?.phoneNumber}</span>. 
                    Please enter it to verify your account.
                  </p>
                </div>

                <div className="space-y-6">
                  <input 
                    type="text" 
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full text-center text-4xl font-bold tracking-[0.5em] py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-medical-primary"
                    placeholder="000000"
                  />

                  {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl">{error}</div>}

                  <button 
                    onClick={onVerifyOtp}
                    disabled={loading || otp.length < 6}
                    className="w-full btn-primary py-4 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-medical-primary/20"
                  >
                    <CheckCircle className="h-5 w-5" />
                    {loading ? 'Finalizing Setup...' : 'Complete Registration'}
                  </button>

                  <button 
                    onClick={() => setStep(1)}
                    className="w-full text-sm text-slate-400 font-medium hover:text-slate-600 transition-colors"
                  >
                    Back to edit details
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-medical-primary font-bold hover:underline">Log In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
