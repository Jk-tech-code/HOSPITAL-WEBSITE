import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, updateDoc, doc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Appointment, Doctor, UserProfile } from '../types';
import { User, Calendar, Plus, Trash2, Check, X, Filter, Users, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'appointments' | 'doctors' | 'patients'>('appointments');
  const [filter, setFilter] = useState('all');

  // New Doctor Form State
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: '', specialization: '', department: '', bio: '', experience: '', photoURL: '' });

  const fetchData = async () => {
    const appSnap = await getDocs(collection(db, 'appointments'));
    const docSnap = await getDocs(collection(db, 'doctors'));
    const userSnap = await getDocs(collection(db, 'users'));
    
    setAppointments(appSnap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
    setDoctors(docSnap.docs.map(d => ({ id: d.id, ...d.data() } as Doctor)));
    setPatients(userSnap.docs.map(d => ({ id: d.id, ...d.data() } as any as UserProfile)).filter(u => u.role === 'patient'));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (appId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'appointments', appId), { status });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'doctors'), {
        ...newDoc,
        photoURL: newDoc.photoURL || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=500'
      });
      setShowAddDoctor(false);
      setNewDoc({ name: '', specialization: '', department: '', bio: '', experience: '', photoURL: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    if (!confirm('Are you sure you want to remove this doctor?')) return;
    try {
      await deleteDoc(doc(db, 'doctors', id));
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAppointments = appointments.filter(a => filter === 'all' || a.status === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-slate-900 rounded-2xl">
            <Users className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Admin Console</h1>
            <p className="text-slate-500 font-medium">Hospital Management & Resource Control</p>
          </div>
        </div>
        
        <div className="mt-6 md:mt-0 flex items-center space-x-3">
           <button 
             onClick={() => setShowAddDoctor(true)}
             className="btn-primary py-3 px-6 flex items-center space-x-2"
           >
             <Plus className="h-5 w-5" />
             <span>Add Doctor</span>
           </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex space-x-8 border-b border-slate-200 mb-8 overflow-x-auto">
        {[
          { id: 'appointments', label: 'All Appointments', icon: <Calendar className="h-5 w-5" /> },
          { id: 'doctors', label: 'Doctor Management', icon: <Stethoscope className="h-5 w-5" /> },
          { id: 'patients', label: 'Patient Database', icon: <User className="h-5 w-5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-all font-semibold ${
              activeTab === tab.id 
                ? 'border-medical-primary text-medical-primary translate-y-[1px]' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'appointments' && (
            <motion.div 
              key="appointments"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-6"
            >
              <div className="flex items-center justify-between mb-8 overflow-x-auto gap-4">
                <h3 className="text-xl font-bold text-slate-900">Appointment Queue</h3>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-1.5 space-x-2">
                   <Filter className="h-4 w-4 text-slate-400" />
                   <select 
                     value={filter}
                     onChange={(e) => setFilter(e.target.value)}
                     className="bg-transparent text-sm font-medium outline-none text-slate-600"
                   >
                     <option value="all">All Sessions</option>
                     <option value="pending">Pending</option>
                     <option value="confirmed">Confirmed</option>
                     <option value="cancelled">Cancelled</option>
                   </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-xs uppercase tracking-widest font-bold border-b border-slate-50">
                      <th className="pb-4">Patient</th>
                      <th className="pb-4">Specialist</th>
                      <th className="pb-4">Schedule</th>
                      <th className="pb-4">Status</th>
                      <th className="pb-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredAppointments.map(app => (
                      <tr key={app.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-5 font-bold text-slate-900">UID: {app.userId.slice(0, 8)}...</td>
                        <td className="py-5 font-medium text-slate-600">{app.doctorName}</td>
                        <td className="py-5 text-slate-500 text-sm">{app.date} at {app.time}</td>
                        <td className="py-5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            app.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="py-5 text-right space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {app.status === 'pending' && (
                             <>
                               <button onClick={() => handleUpdateStatus(app.id, 'confirmed')} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"><Check className="h-4 w-4" /></button>
                               <button onClick={() => handleUpdateStatus(app.id, 'cancelled')} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><X className="h-4 w-4" /></button>
                             </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'doctors' && (
            <motion.div 
               key="doctors"
               initial={{ opacity: 0 }} animate={{ opacity: 1 }}
               className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {doctors.map(doc => (
                <div key={doc.id} className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 relative group">
                  <button 
                    onClick={() => handleDeleteDoctor(doc.id)}
                    className="absolute top-4 right-4 p-2 bg-white text-red-500 rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <img src={doc.photoURL} alt={doc.name} className="w-16 h-16 rounded-2xl object-cover mb-4" />
                  <h4 className="font-bold text-slate-900">{doc.name}</h4>
                  <p className="text-xs font-bold text-medical-primary uppercase tracking-widest mt-1">{doc.specialization}</p>
                  <div className="mt-4 pt-4 border-t border-slate-200 text-sm text-slate-500">
                     Dept: {doc.department}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'patients' && (
             <motion.div 
               key="patients"
               initial={{ opacity: 0 }} animate={{ opacity: 1 }}
               className="p-8"
             >
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {patients.map(p => (
                   <div key={p.uid} className="flex items-center space-x-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold">
                         {p.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{p.displayName}</h4>
                        <p className="text-xs text-slate-500">{p.email}</p>
                      </div>
                   </div>
                 ))}
               </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Doctor Modal */}
      {showAddDoctor && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="bg-white rounded-[32px] w-full max-w-xl p-10"
           >
              <h2 className="text-3xl font-display font-bold text-slate-900 mb-8 tracking-tight">Onboard New Specialist</h2>
              <form onSubmit={handleAddDoctor} className="space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                       <label className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 block">Full Name</label>
                       <input 
                         required placeholder="Dr. Gregory House"
                         className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-medical-primary"
                         value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})}
                       />
                    </div>
                    <div>
                       <label className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 block">Specialization</label>
                       <input 
                         required placeholder="Infectious Diseases"
                         className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-medical-primary"
                         value={newDoc.specialization} onChange={e => setNewDoc({...newDoc, specialization: e.target.value})}
                       />
                    </div>
                    <div>
                       <label className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 block">Department</label>
                       <input 
                         required placeholder="Diagnostics"
                         className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-medical-primary"
                         value={newDoc.department} onChange={e => setNewDoc({...newDoc, department: e.target.value})}
                       />
                    </div>
                 </div>
                 <div className="flex space-x-4 mt-8 pt-8 border-t border-slate-100">
                    <button type="button" onClick={() => setShowAddDoctor(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl">Cancel</button>
                    <button type="submit" className="flex-[2] btn-primary py-4 rounded-2xl shadow-xl shadow-medical-primary/20">Confirm Specialist</button>
                 </div>
              </form>
           </motion.div>
        </div>
      )}
    </div>
  );
}
