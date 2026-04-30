import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Appointment, Doctor, Report, Message } from '../types';
import { Calendar, FileText, MessageSquare, Plus, Clock, CheckCircle2, XCircle, Send, Settings, User as UserIcon, Camera, Save, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isBefore, startOfToday } from 'date-fns';

const AVAILABLE_TIMES = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

export default function PatientDashboard() {
  const { profile, user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [activeTab, setActiveTab] = useState<'appointments' | 'reports' | 'messages' | 'settings'>('appointments');
  
  // Profile Edit State
  const [editMode, setEditMode] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(profile?.displayName || '');
  const [newPhotoURL, setNewPhotoURL] = useState(profile?.photoURL || '');
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // Booking Form State
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  // Messaging State
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (!user) return;

    // Fetch Doctors for booking
    getDocs(collection(db, 'doctors')).then(snap => {
      setDoctors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Doctor)));
    });

    // Subscriptions
    const qApp = query(collection(db, 'appointments'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubApp = onSnapshot(qApp, (snap) => {
      setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
    });

    const unsubAllApp = onSnapshot(collection(db, 'appointments'), (snap) => {
      setAllAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
    });

    const qRep = query(collection(db, 'reports'), where('userId', '==', user.uid), orderBy('uploadedAt', 'desc'));
    const unsubRep = onSnapshot(qRep, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report)));
    });

    const qMsg = query(collection(db, 'messages'), where('receiverId', '==', user.uid), orderBy('timestamp', 'asc')); // Simple logic for demo
    const unsubMsg = onSnapshot(qMsg, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    });

    return () => { unsubApp(); unsubAllApp(); unsubRep(); unsubMsg(); };
  }, [user]);

  const isSlotUnavailable = (docId: string, dDate: string, dTime: string) => {
    const doctor = doctors.find(d => d.id === docId);
    const isBlocked = doctor?.blockedSlots?.some(s => s.date === dDate && s.time === dTime);
    const isBooked = allAppointments.some(a => a.doctorId === docId && a.date === dDate && a.time === dTime && a.status !== 'cancelled');
    return isBlocked || isBooked;
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'appointments'), {
        userId: user.uid,
        doctorId: selectedDoctor,
        doctorName: doctors.find(d => d.id === selectedDoctor)?.name || 'Doctor',
        date,
        time,
        notes,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setShowBooking(false);
      // Reset form
      setSelectedDoctor(''); setDate(''); setTime(''); setNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        senderName: profile?.displayName || 'User',
        receiverId: 'admin', // Demo logic
        content: newMessage,
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Patient Dashboard</h1>
          <p className="text-slate-500 mt-1">Hello, {profile?.displayName}. Welcome back.</p>
        </div>
        <button 
          onClick={() => setShowBooking(true)}
          className="btn-primary flex items-center justify-center space-x-2 py-3 px-6"
        >
          <Plus className="h-5 w-5" />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 p-1 bg-slate-200/50 rounded-xl mb-8 w-fit">
        {[
          { id: 'appointments', label: 'Appointments', icon: <Calendar className="h-4 w-4" /> },
          { id: 'reports', label: 'Medical Reports', icon: <FileText className="h-4 w-4" /> },
          { id: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
          { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-medical-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        <AnimatePresence mode="wait">
          {activeTab === 'appointments' && (
            <motion.div 
              key="appointments"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {appointments.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                   <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                   <h3 className="text-lg font-medium text-slate-900">No appointments found</h3>
                   <p className="text-slate-500 mb-6">You haven't booked any medical consultations yet.</p>
                   <button onClick={() => setShowBooking(true)} className="text-medical-primary font-bold hover:underline">Book Your First Appointment</button>
                </div>
              ) : (
                appointments.map((app) => (
                  <div key={app.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center space-x-6">
                      <div className="w-14 h-14 bg-medical-light rounded-xl flex items-center justify-center text-medical-primary">
                        <Clock className="h-7 w-7" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{app.doctorName}</h4>
                        <div className="flex items-center space-x-4 text-sm text-slate-500 mt-1">
                          <span>{app.date}</span>
                          <span>{app.time}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        app.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {app.status}
                      </span>
                      {app.status === 'confirmed' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {app.status === 'cancelled' && <XCircle className="h-5 w-5 text-red-500" />}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {reports.length === 0 ? (
                 <div className="col-span-full text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No medical reports available yet.</p>
                 </div>
              ) : (
                reports.map(rep => (
                  <div key={rep.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 bg-red-50 text-red-500 rounded-xl w-fit mb-4">
                      <FileText className="h-6 w-6" />
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1">{rep.title}</h4>
                    <p className="text-xs text-slate-400 mb-4 uppercase tracking-widest">{format(rep.uploadedAt?.toDate() || new Date(), 'MMM dd, yyyy')}</p>
                    <a href={rep.fileURL} download className="text-sm font-bold text-medical-primary hover:underline">Download Report</a>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'messages' && (
              <motion.div 
                key="messages"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden h-[600px] flex flex-col"
              >
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Secure Messaging</h3>
                  <div className="flex items-center space-x-2 text-xs font-bold text-green-500 bg-green-50 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>Always Online</span>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 && (
                    <div className="h-full flex items-center justify-center text-slate-400 italic">
                      No messages yet. Say hello to our support team!
                    </div>
                  )}
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-4 rounded-2xl text-sm ${
                        msg.senderId === user?.uid 
                          ? 'bg-medical-primary text-white rounded-tr-none' 
                          : 'bg-slate-100 text-slate-700 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 flex items-center space-x-2">
                  <input 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-medical-primary transition-all"
                  />
                  <button type="submit" className="p-3 bg-medical-primary text-white rounded-xl hover:bg-medical-secondary transition-colors">
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto w-full"
            >
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden text-left">
                <div className="h-32 bg-medical-primary/10 relative">
                  <div className="absolute -bottom-12 left-8">
                    <div className="relative group">
                      <img 
                        src={profile?.photoURL || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&q=80&w=200'} 
                        className="w-24 h-24 rounded-2xl border-4 border-white shadow-md object-cover"
                        alt="Profile"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer" onClick={() => setEditMode(true)}>
                        <Camera className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-16 p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-display font-bold text-slate-900">{profile?.displayName}</h3>
                      <p className="text-slate-500">{profile?.email} • Patient</p>
                    </div>
                    {!editMode && (
                      <button 
                        onClick={() => setEditMode(true)}
                        className="px-6 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Display Name</label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input 
                            disabled={!editMode}
                            value={newDisplayName}
                            onChange={(e) => setNewDisplayName(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none disabled:opacity-50"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Profile Photo URL</label>
                        <div className="relative">
                          <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input 
                            disabled={!editMode}
                            value={newPhotoURL}
                            onChange={(e) => setNewPhotoURL(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>

                    {editMode && (
                      <div className="flex space-x-4 pt-4">
                        <button 
                          type="button" 
                          onClick={() => setEditMode(false)}
                          className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          disabled={updateLoading}
                          type="submit"
                          className="flex-1 btn-primary py-3 rounded-xl flex items-center justify-center space-x-2"
                        >
                          <Save className="h-5 w-5" />
                          <span>{updateLoading ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-display font-bold text-slate-900">New Appointment</h2>
              <button onClick={() => setShowBooking(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Specialist</label>
                <select 
                  required
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                >
                  <option value="">Choose a doctor...</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                  <input 
                    required
                    type="date" 
                    min={format(startOfToday(), 'yyyy-MM-dd')}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
                {date && selectedDoctor && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Available Slots</label>
                    <div className="grid grid-cols-4 gap-2">
                      {AVAILABLE_TIMES.map(slot => {
                        const unavailable = isSlotUnavailable(selectedDoctor, date, slot);
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={unavailable}
                            onClick={() => setTime(slot)}
                            className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                              time === slot 
                                ? 'bg-medical-primary border-medical-primary text-white' 
                                : unavailable 
                                  ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' 
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-medical-primary'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Symptoms / Notes</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none h-24 resize-none"
                  placeholder="Describe your condition briefly..."
                />
              </div>

              <button type="submit" className="w-full btn-primary py-4 rounded-xl text-lg shadow-xl shadow-medical-primary/20">
                Confirm Booking
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
