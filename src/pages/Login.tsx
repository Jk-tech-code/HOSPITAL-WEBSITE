import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, AlertCircle, Chrome } from 'lucide-react';
import { motion } from 'motion/react';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const seedData = async () => {
    try {
      const doctorsRef = collection(db, 'doctors');
      const depsRef = collection(db, 'departments');
      
      const doctors = [
        { name: 'Dr. Sarah Mitchell', specialization: 'Senior Cardiologist', department: 'Cardiology', bio: 'Expert in heart failure and cardiovascular surgery.', experience: '15 years', photoURL: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=500' },
        { name: 'Dr. James Wilson', specialization: 'Neurologist', department: 'Neurology', bio: 'Specialist in neurodegenerative diseases and brain mapping.', experience: '10 years', photoURL: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=500' },
        { name: 'Dr. Elena Rodriguez', specialization: 'Orthopedic Surgeon', department: 'Orthopedics', bio: 'Pioneer in minimally invasive joint replacement surgeries.', experience: '12 years', photoURL: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=500' }
      ];

      const deps = [
        { name: 'Cardiology', description: 'Advanced heart care services.', icon: 'heart' },
        { name: 'Neurology', description: 'Comprehensive brain and nerve care.', icon: 'brain' },
        { name: 'Orthopedics', description: 'Expert bone and joint treatments.', icon: 'bone' }
      ];

      for (const docItem of doctors) await addDoc(doctorsRef, docItem);
      for (const depItem of deps) await addDoc(depsRef, depItem);
      alert('System seeded successfully! Please refresh.');
    } catch (err) {
      console.error(err);
      alert('Seeding failed. Check console.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <div className="fixed bottom-4 right-4 z-50">
         <button onClick={seedData} className="px-3 py-1 bg-slate-800 text-white text-[10px] rounded-full opacity-50 hover:opacity-100 transition-opacity">Dev: Seed System</button>
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
            <p className="text-slate-500 text-sm mt-2 text-center">Access your healthcare portal and manage your well-being.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  {...register('email')}
                  type="email" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary focus:border-transparent outline-none transition-all"
                  placeholder="name@example.com"
                />
              </div>
              {errors.email && <span className="text-red-500 text-xs mt-1">{errors.email.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  {...register('password')}
                  type="password" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <span className="text-red-500 text-xs mt-1">{errors.password.message}</span>}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center space-x-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn-primary py-3 rounded-xl shadow-lg shadow-medical-primary/20 hover:shadow-medical-primary/30 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Entering...' : 'Log In'}
            </button>
          </form>

          <div className="mt-8 flex items-center before:content-[''] before:flex-1 before:border-b before:border-slate-100 after:content-[''] after:flex-1 after:border-b after:border-slate-100 text-slate-400 text-xs gap-4 uppercase font-bold tracking-widest">
            Or continue with
          </div>

          <button 
            onClick={signInWithGoogle}
            className="mt-6 w-full flex items-center justify-center space-x-3 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-700 shadow-sm"
          >
            <Chrome className="h-5 w-5" />
            <span>Google Workplace</span>
          </button>

          <p className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-medical-primary font-bold hover:underline">Create Account</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
