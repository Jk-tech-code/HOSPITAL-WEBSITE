import { motion } from 'motion/react';
import { Stethoscope, Heart, Brain, Bone, ArrowRight, Star, Clock, ShieldCheck, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Doctor, Department } from '../types';

export default function LandingPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const docsSnap = await getDocs(collection(db, 'doctors'));
      const depsSnap = await getDocs(collection(db, 'departments'));
      
      setDoctors(docsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor)));
      setDepartments(depsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department)));
    };
    loadData();
  }, []);

  const defaultDeps = [
    { id: '1', name: 'Cardiology', description: 'Expert care for your heart and vascular system.', icon: <Heart className="h-6 w-6" /> },
    { id: '2', name: 'Neurology', description: 'Specialized treatment for brain and nervous disorders.', icon: <Brain className="h-6 w-6" /> },
    { id: '3', name: 'Orthopedics', description: 'Advanced solutions for bone and joint health.', icon: <Bone className="h-6 w-6" /> },
    { id: '4', name: 'General Medicine', description: 'Comprehensive primary care for individuals.', icon: <Stethoscope className="h-6 w-6" /> },
  ];

  const displayDeps = departments.length > 0 ? departments : defaultDeps;

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-medical-light/90 via-medical-light/50 to-transparent z-10" />
          <img 
            src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2000" 
            alt="Hospital Hallway" 
            className="w-full h-full object-cover"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-medical-primary/10 text-medical-secondary text-sm font-semibold mb-6">
              <ShieldCheck className="h-4 w-4" />
              <span>Accredited Healthcare Facility</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-display font-bold text-slate-900 leading-tight mb-6">
              Your Health is Our <span className="text-medical-primary">Priority.</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              Experience world-class medical services with Hopekim Hospital. 
              Our team of expert doctors and state-of-the-art technology are here to ensure your well-being.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Link to="/signup" className="btn-primary py-4 px-8 text-lg text-center flex items-center justify-center">
                Book Appointment <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a href="#departments" className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-colors text-center">
                View Specialized Departments
              </a>
            </div>
            
            <div className="mt-12 flex items-center space-x-8 text-slate-500">
               <div className="flex items-center space-x-2">
                 <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                 <span className="font-bold text-slate-800">4.9/5</span>
                 <span className="text-sm">(2k+ Reviews)</span>
               </div>
               <div className="flex items-center space-x-2">
                 <Clock className="h-5 w-5 text-medical-primary" />
                 <span className="font-medium">24/7 Emergency Support</span>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Departments Section */}
      <section id="departments" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <h2 className="text-4xl font-display font-bold text-slate-900 mb-4">Our Departments</h2>
          <p className="text-slate-500 max-w-2xl mx-auto italic">
            Providing specialized care across various medical fields to ensure a holistic healing journey.
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {displayDeps.map((dep, index) => (
            <motion.div 
              key={dep.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-xl hover:border-medical-primary/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-medical-primary/10 flex items-center justify-center text-medical-primary mb-6 group-hover:scale-110 transition-transform">
                {typeof dep.icon === 'string' ? <Activity className="h-6 w-6" /> : dep.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{dep.name}</h3>
              <p className="text-slate-500 leading-relaxed text-sm mb-6">
                {dep.description}
              </p>
              <Link to="/signup" className="text-medical-primary font-semibold text-sm flex items-center hover:translate-x-1 transition-transform">
                Learn More <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Doctors Section */}
      <section id="doctors" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-end justify-between mb-12">
          <div className="mb-8 md:mb-0">
            <h2 className="text-4xl font-display font-bold text-slate-900 mb-4">World-Class Specialists</h2>
            <p className="text-slate-500 max-w-md">Our team of experienced practitioners committed to providing the highest quality of healthcare.</p>
          </div>
          <Link to="/signup" className="flex items-center text-medical-primary font-bold hover:underline">
            View All Doctors <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          {(doctors.length > 0 ? doctors : [
            { id: '1', name: 'Dr. Sarah Mitchell', specialization: 'Senior Cardiologist', photoURL: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=500', department: 'Cardiology' },
            { id: '2', name: 'Dr. James Wilson', specialization: 'Neurologist', photoURL: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=500', department: 'Neurology' },
            { id: '3', name: 'Dr. Elena Rodriguez', specialization: 'Orthopedic Surgeon', photoURL: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=500', department: 'Orthopedics' },
          ]).map((doc) => (
            <motion.div 
              key={doc.id}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 group"
              whileHover={{ y: -10 }}
            >
              <div className="h-64 relative overflow-hidden">
                <img src={doc.photoURL} alt={doc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-full px-3 py-1 text-xs font-bold text-medical-secondary">
                  {doc.department}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-1">{doc.name}</h3>
                <p className="text-sm font-medium text-medical-primary mb-4">{doc.specialization}</p>
                <Link to="/signup" className="w-full btn-primary block text-center py-2">Book Appointment</Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-6">
              <Activity className="h-8 w-8 text-medical-primary" />
              <span className="text-2xl font-display font-bold text-white">Hopekim</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed mb-6">
              Leading the way in medical excellence and patient-centered care. Your partner in health since 1998.
            </p>
          </div>
          <div>
             <h4 className="text-white font-bold mb-6">Quick Links</h4>
             <ul className="space-y-4 text-sm">
               <li><a href="#" className="hover:text-medical-primary transition-colors">Emergency Services</a></li>
               <li><a href="#" className="hover:text-medical-primary transition-colors">Book Appointment</a></li>
               <li><a href="#" className="hover:text-medical-primary transition-colors">Patient Portal</a></li>
               <li><a href="#" className="hover:text-medical-primary transition-colors">Careers</a></li>
             </ul>
          </div>
          <div>
             <h4 className="text-white font-bold mb-6">Contact Us</h4>
             <p className="text-sm mb-4">123 Medical Avenue, Healthcare City, 56789</p>
             <p className="text-sm mb-2 text-white font-medium">+1 (234) 567-890</p>
             <p className="text-sm text-white font-medium">contact@healthguard.com</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-slate-800 text-center text-xs">
          © {new Date().getFullYear()} Hopekim Hospital. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
