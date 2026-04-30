import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, updateDoc, doc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Appointment, Doctor, UserProfile } from '../types';
import { 
  User, 
  Calendar, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Filter, 
  Users, 
  Stethoscope, 
  Bell, 
  ShieldCheck, 
  Mail, 
  Smartphone, 
  Settings, 
  Camera, 
  Save, 
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  startOfToday, 
  addDays, 
  format as formatFns, 
  startOfWeek, 
  addWeeks, 
  subWeeks, 
  eachDayOfInterval, 
  endOfWeek,
  isSameDay,
  parseISO
} from 'date-fns';

export default function AdminDashboard() {
  const { profile, user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'appointments' | 'doctors' | 'patients' | 'reminders' | 'settings'>('appointments');
  const [doctorSubTab, setDoctorSubTab] = useState<'list' | 'availability'>('list');
  const [filter, setFilter] = useState('all');

  const [remindersLoading, setRemindersLoading] = useState(false);
  const [reminderResult, setReminderResult] = useState<any>(null);

  // Schedule View State
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [currentScheduleDate, setCurrentScheduleDate] = useState(startOfToday());

  // Profile Edit State
  const [editMode, setEditMode] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(profile?.displayName || '');
  const [newPhotoURL, setNewPhotoURL] = useState(profile?.photoURL || '');
  const [updateLoading, setUpdateLoading] = useState(false);

  // New Doctor Form State
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState<Doctor | null>(null);
  const [newDoc, setNewDoc] = useState({ name: '', specialization: '', department: '', bio: '', experience: '', photoURL: '' });

  const loadData = async () => {
    const appSnap = await getDocs(collection(db, 'appointments'));
    const docSnap = await getDocs(collection(db, 'doctors'));
    const userSnap = await getDocs(collection(db, 'users'));
    
    setAppointments(appSnap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
    setDoctors(docSnap.docs.map(d => ({ id: d.id, ...d.data() } as Doctor)));
    setPatients(userSnap.docs.map(d => ({ id: d.id, ...d.data() } as any as UserProfile)).filter(u => u.role === 'patient'));
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerReminders = async () => {
    setRemindersLoading(true);
    setReminderResult(null);
    try {
      const res = await window.fetch('/api/admin/trigger-reminders', { method: 'POST' });
      const data = await res.json();
      setReminderResult(data);
      loadData(); // Refresh to see updated reminderSent status
    } catch (err) {
      console.error(err);
      alert('Failed to trigger reminders process');
    } finally {
      setRemindersLoading(false);
    }
  };

  const handleUpdateStatus = async (appId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'appointments', appId), { status });
      
      if (status === 'confirmed') {
        const app = appointments.find(a => a.id === appId);
        if (app) {
          await addDoc(collection(db, 'messages'), {
            senderId: user?.uid || 'admin',
            senderName: profile?.displayName || 'Hopekim Hospital Admin',
            receiverId: app.userId,
            content: `CONFIRMATION: Your appointment with ${app.doctorName} on ${app.date} at ${app.time} has been confirmed. We look forward to seeing you.`,
            timestamp: serverTimestamp()
          });
        }
      }
      
      loadData();
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
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    if (!confirm('Are you sure you want to remove this doctor?')) return;
    try {
      await deleteDoc(doc(db, 'doctors', id));
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUpdateLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: newDisplayName,
        photoURL: newPhotoURL,
        updatedAt: serverTimestamp()
      });
      setEditMode(false);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleToggleBlockSlot = async (doctorId: string, date: string, time: string) => {
    const doctor = doctors.find(d => d.id === doctorId);
    if (!doctor) return;

    const blockedSlots = doctor.blockedSlots || [];
    const slotIndex = blockedSlots.findIndex(s => s.date === date && s.time === time);

    let newBlockedSlots;
    if (slotIndex > -1) {
      newBlockedSlots = blockedSlots.filter((_, i) => i !== slotIndex);
    } else {
      newBlockedSlots = [...blockedSlots, { date, time }];
    }

    try {
      await updateDoc(doc(db, 'doctors', doctorId), { blockedSlots: newBlockedSlots });
      loadData();
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
          { id: 'reminders', label: 'SMS/Email Automation', icon: <Bell className="h-5 w-5" /> },
          { id: 'settings', label: 'Admin Settings', icon: <Settings className="h-5 w-5" /> },
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
                      <th className="pb-4 text-center">Reminder</th>
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
                        <td className="py-5 text-center">
                          {app.reminderSent ? (
                            <div className="flex items-center justify-center text-green-500" title="Reminder Sent">
                              <Bell className="h-4 w-4" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center text-slate-200" title="Not Sent">
                              <Bell className="h-4 w-4" />
                            </div>
                          )}
                        </td>
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
               key="doctors-view"
               initial={{ opacity: 0 }} animate={{ opacity: 1 }}
               className="p-8"
            >
              <div className="flex items-center space-x-4 mb-8 bg-slate-50 p-2 rounded-2xl w-fit">
                <button 
                  onClick={() => setDoctorSubTab('list')}
                  className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${doctorSubTab === 'list' ? 'bg-white text-medical-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Doctor List
                </button>
                <button 
                  onClick={() => setDoctorSubTab('availability')}
                  className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${doctorSubTab === 'availability' ? 'bg-white text-medical-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Doctor Availability
                </button>
              </div>

              {doctorSubTab === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {doctors.map(doc => (
                    <div 
                      key={doc.id} 
                      onClick={() => setSelectedDoctorProfile(doc)}
                      className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 relative group cursor-pointer hover:border-medical-primary transition-all hover:bg-white hover:shadow-xl hover:shadow-medical-primary/5"
                    >
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDoctor(doc.id);
                        }}
                        className="absolute top-4 right-4 p-2 bg-white text-red-500 rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <img src={doc.photoURL} alt={doc.name} className="w-16 h-16 rounded-2xl object-cover mb-4" />
                      <h4 className="font-bold text-slate-900">{doc.name}</h4>
                      <p className="text-xs font-bold text-medical-primary uppercase tracking-widest mt-1">{doc.specialization}</p>
                      <div className="mt-4 pt-4 border-t border-slate-200 text-sm text-slate-500 flex justify-between items-center">
                         <span>Dept: {doc.department}</span>
                         <span className="text-[10px] font-bold text-slate-400">VIEW PROFILE →</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Schedule Control Panel</h3>
                      <p className="text-slate-500 text-sm">Select a specialist to manage their operational hours.</p>
                    </div>
                    <select 
                      value={selectedDoctorId || ''}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-medical-primary"
                    >
                      <option value="">Select a Specialist</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedDoctorId ? (
                    <div className="space-y-6">
                      {/* Calendar Navigation */}
                      <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl text-white">
                        <button 
                          onClick={() => setCurrentScheduleDate(subWeeks(currentScheduleDate, 1))}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <h4 className="font-bold uppercase tracking-widest text-xs">
                          {formatFns(startOfWeek(currentScheduleDate), 'MMM d')} - {formatFns(endOfWeek(currentScheduleDate), 'MMM d, yyyy')}
                        </h4>
                        <button 
                          onClick={() => setCurrentScheduleDate(addWeeks(currentScheduleDate, 1))}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-4">
                        {eachDayOfInterval({
                          start: startOfWeek(currentScheduleDate),
                          end: endOfWeek(currentScheduleDate)
                        }).map((day) => {
                          const dayStr = formatFns(day, 'yyyy-MM-dd');
                          const doctor = doctors.find(d => d.id === selectedDoctorId);
                          const dayAppointments = appointments.filter(a => a.doctorId === selectedDoctorId && a.date === dayStr);
                          const blockedSlots = doctor?.blockedSlots || [];

                          return (
                            <div key={dayStr} className="space-y-3">
                              <div className={`p-4 rounded-2xl text-center border transition-all ${isSameDay(day, startOfToday()) ? 'bg-medical-primary text-white border-medical-primary shadow-lg shadow-medical-primary/20' : 'bg-slate-50 border-slate-100'}`}>
                                <p className="text-[10px] font-bold uppercase opacity-60 mb-1">{formatFns(day, 'EEE')}</p>
                                <p className="text-xl font-bold font-display">{formatFns(day, 'd')}</p>
                              </div>
                              
                              <div className="space-y-2">
                                {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'].map(time => {
                                  const isBlocked = blockedSlots.some(s => s.date === dayStr && s.time === time);
                                  const appointment = dayAppointments.find(a => a.time === time);
                                  
                                  return (
                                    <button
                                      key={time}
                                      onClick={() => !appointment && handleToggleBlockSlot(selectedDoctorId, dayStr, time)}
                                      className={`w-full p-3 rounded-xl text-left border relative transition-all group overflow-hidden ${
                                        appointment 
                                          ? 'bg-blue-50 border-blue-100' 
                                          : isBlocked 
                                            ? 'bg-slate-800 border-slate-900 text-slate-400' 
                                            : 'bg-white border-slate-100 hover:border-medical-primary hover:bg-medical-primary/5'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold">{time}</span>
                                        {appointment ? (
                                           <div className="flex items-center space-x-1">
                                             <span className="text-[8px] font-bold text-blue-400">PATIENT IN</span>
                                             <Calendar className="h-3 w-3 text-blue-400" />
                                           </div>
                                        ) : isBlocked ? (
                                           <Lock className="h-3 w-3 text-slate-500" />
                                        ) : (
                                           <Plus className="h-3 w-3 text-slate-300 group-hover:text-medical-primary" />
                                        )}
                                      </div>
                                      <p className={`text-[10px] font-bold mt-1 truncate ${
                                        appointment ? 'text-blue-600' : isBlocked ? 'text-slate-500 uppercase' : 'text-slate-400'
                                      }`}>
                                        {appointment ? `Reserved: ${appointment.status}` : isBlocked ? 'Blocked' : 'Free Slot'}
                                      </p>
                                      {appointment && (
                                        <p className="text-[8px] text-blue-500/60 font-medium truncate mt-0.5">UID: {appointment.userId.slice(0, 8)}</p>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-20 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
                       <Stethoscope className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                       <h4 className="text-xl font-bold text-slate-400">Select a Specialist to manage their availability</h4>
                    </div>
                  )}
                </div>
              )}
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

          {activeTab === 'reminders' && (
             <motion.div 
               key="reminders" 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }}
               className="p-12 text-center"
             >
               <div className="max-w-xl mx-auto">
                 <div className="p-4 bg-blue-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 text-blue-600">
                    <Bell className="h-10 w-10 animate-pulse" />
                 </div>
                 <h3 className="text-3xl font-display font-bold text-slate-900 mb-4">Appointment Reminders</h3>
                 <p className="text-slate-500 mb-8 leading-relaxed">
                   Hopekim Hospital automatically scans for appointments scheduled for tomorrow 
                   and sends a courtesy SMS or Email notification to patients 24 hours in advance.
                 </p>

                 <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 mb-8 text-left">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Automation Status</h4>
                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                          <span className="text-slate-700 font-medium flex items-center gap-2"><Smartphone className="h-4 w-4" /> Global SMS Gateway</span>
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md uppercase tracking-wider">Active</span>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-slate-700 font-medium flex items-center gap-2"><Mail className="h-4 w-4" /> SMTP Email Server</span>
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md uppercase tracking-wider">Active</span>
                       </div>
                    </div>
                 </div>

                 <button 
                  onClick={triggerReminders}
                  disabled={remindersLoading}
                  className="w-full btn-primary py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-medical-primary/20"
                 >
                   {remindersLoading ? (
                     <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   ) : (
                     <ShieldCheck className="h-5 w-5" />
                   )}
                   <span>{remindersLoading ? 'Running Batch Job...' : 'Run 24h Reminder Batch'}</span>
                 </button>

                 {reminderResult && (
                   <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-6 bg-green-50 border border-green-100 rounded-2xl text-left"
                   >
                     <p className="text-green-800 font-bold mb-2">Success: {reminderResult.message}</p>
                     {reminderResult.details && reminderResult.details.length > 0 ? (
                       <ul className="text-xs text-green-700 space-y-1">
                         {reminderResult.details.map((d: any) => (
                           <li key={d.id}>• Sent to {d.user} ({d.time})</li>
                         ))}
                       </ul>
                     ) : (
                       <p className="text-xs text-green-600">No pending appointments found for tomorrow.</p>
                     )}
                   </motion.div>
                 )}
               </div>
             </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-12 max-w-2xl mx-auto w-full text-left"
            >
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 mb-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 bg-medical-primary h-full" />
                <div className="flex items-center space-x-6 mb-8">
                  <div className="relative group">
                    <img 
                      src={profile?.photoURL || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&q=80&w=200'} 
                      className="w-20 h-20 rounded-2xl border-2 border-white shadow-sm object-cover"
                      alt="Profile"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer" onClick={() => setEditMode(true)}>
                      <Camera className="h-5 w-5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-bold text-slate-900">{profile?.displayName}</h3>
                    <p className="text-slate-500 font-medium">Administrator Portal Access</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Display Identity</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input 
                        disabled={!editMode}
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-medical-primary transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Profile Image Link</label>
                    <div className="relative">
                      <Camera className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input 
                        disabled={!editMode}
                        value={newPhotoURL}
                        onChange={(e) => setNewPhotoURL(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-medical-primary transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {!editMode ? (
                    <button 
                      type="button"
                      onClick={() => setEditMode(true)}
                      className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl font-bold text-slate-400 hover:border-medical-primary hover:text-medical-primary transition-all"
                    >
                      Modify Admin Credentials
                    </button>
                  ) : (
                    <div className="flex space-x-4">
                      <button 
                        type="button" 
                        onClick={() => setEditMode(false)}
                        className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-colors"
                      >
                        Discard
                      </button>
                      <button 
                        disabled={updateLoading}
                        type="submit"
                        className="flex-[2] btn-primary py-4 rounded-2xl flex items-center justify-center space-x-2"
                      >
                        <Save className="h-5 w-5" />
                        <span>{updateLoading ? 'Saving...' : 'Synchronize Profile'}</span>
                      </button>
                    </div>
                  )}
                </form>
              </div>

              <div className="p-6 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-4 mb-6">
                <ShieldCheck className="h-6 w-6 text-red-500" />
                <div className="text-sm">
                  <p className="font-bold text-red-700">Security Warning</p>
                  <p className="text-red-500">Authorized personnel only. Changes are logged for audit purposes.</p>
                </div>
              </div>

              <div className="bg-slate-900 rounded-3xl p-8 text-white">
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-6">Development Utilities</h4>
                <div className="space-y-4">
                  <button 
                    onClick={async () => {
                      const staff = [
                        { name: 'Dr. Jacob Kiptoo', specialization: 'Laboratory, Mortuary & Clinic Specialist', department: 'Diagnostics & Forensic Medicine', bio: 'Expert in clinical laboratory diagnostics, mortuary postmortem examinations, and general clinic consulting.', experience: '20+ years', photoURL: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400' },
                        { name: 'Dr. Joe Njagi', specialization: 'Surgeon, Neurologist & Sinus Specialist', department: 'Surgery & Neurology', bio: 'Senior consultant specializing in neurosurgery, chest interventions, and chronic sinus conditions.', experience: '15 years', photoURL: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400' },
                        { name: 'Dr. Damaris Makokha', specialization: 'Lead Pediatrician', department: 'Pediatrics', bio: 'Dedicated to newborn care and adolescent development.', experience: '12 years', photoURL: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=400' },
                        { name: 'Nurse Brian Kiprop', specialization: 'Head Nurse', department: 'Nursing', bio: 'Critical care specialist coordinating ward operations.', experience: '10 years', photoURL: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=400' },
                        { name: 'Nurse Ali Hassan', specialization: 'Emergency Nurse', department: 'Emergency', bio: 'Rapid response trauma care expert.', experience: '8 years', photoURL: 'https://images.unsplash.com/photo-1622902046580-2b47f47f0871?auto=format&fit=crop&q=80&w=400' },
                        { name: 'Nurse Hilda', specialization: 'Ward Nurse', department: 'Nursing', bio: 'Compassionate patient care and medical administration.', experience: '6 years', photoURL: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=400' },
                        { name: 'Nurse Sylivia', specialization: 'Clinical Nurse', department: 'Outpatient', bio: 'Focused on preventative care and patient education.', experience: '7 years', photoURL: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&q=80&w=400' }
                      ];
                      
                      const doctorsRef = collection(db, 'doctors');
                      for(const member of staff) {
                        await addDoc(doctorsRef, member);
                      }
                      alert('Staff Seeded Successfully!');
                      window.location.reload();
                    }}
                    className="w-full py-4 bg-medical-primary rounded-2xl font-bold hover:bg-medical-primary/80 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Seed Requested Medical Staff
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Doctor Profile Modal */}
      <AnimatePresence>
        {selectedDoctorProfile && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedDoctorProfile(null)}
                className="absolute top-6 right-6 p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 hover:text-slate-600 transition-all z-10"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col md:flex-row">
                <div className="md:w-2/5 relative">
                  <img 
                    src={selectedDoctorProfile.photoURL} 
                    alt={selectedDoctorProfile.name} 
                    className="h-full w-full object-cover min-h-[300px] md:min-h-[450px]"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-slate-900/80 to-transparent text-white pt-20">
                     <div className="flex items-center space-x-2 mb-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Now Active</span>
                     </div>
                     <h2 className="text-2xl font-display font-bold leading-tight">{selectedDoctorProfile.name}</h2>
                  </div>
                </div>

                <div className="md:w-3/5 p-10 overflow-y-auto max-h-[85vh]">
                  <div className="space-y-8">
                     <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Professional Focus</h4>
                        <p className="text-2xl font-display font-bold text-medical-primary">{selectedDoctorProfile.specialization}</p>
                        <p className="text-slate-500 font-medium mt-1">Department of {selectedDoctorProfile.department}</p>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Clinical Exp</h5>
                           <p className="text-lg font-bold text-slate-900">{selectedDoctorProfile.experience}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</h5>
                           <p className="text-lg font-bold text-slate-900">Verified</p>
                        </div>
                     </div>

                     <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Professional Biography</h4>
                        <div className="bg-slate-50 rounded-3xl p-6 text-slate-600 leading-relaxed text-sm border border-slate-100 italic">
                           "{selectedDoctorProfile.bio || 'This specialist has not provided a detailed biography yet. Hopekim Hospital ensures all listed practitioners meet our rigorous clinical standards.'}"
                        </div>
                     </div>

                     <div className="pt-4 flex gap-4">
                        <button 
                          onClick={() => {
                            setSelectedDoctorId(selectedDoctorProfile.id);
                            setSelectedDoctorProfile(null);
                            setActiveTab('schedules');
                          }}
                          className="flex-1 btn-primary py-4 rounded-2xl text-sm"
                        >
                          Manage Schedule
                        </button>
                        <button 
                          onClick={() => setSelectedDoctorProfile(null)}
                          className="flex-1 py-4 border border-slate-200 font-bold text-slate-600 rounded-2xl text-sm hover:bg-slate-50"
                        >
                          Close Profile
                        </button>
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
