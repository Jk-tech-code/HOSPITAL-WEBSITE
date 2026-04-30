export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'patient' | 'doctor' | 'admin';
  idNumber?: string;
  phoneNumber?: string;
  verified?: boolean;
  photoURL?: string;
  createdAt: any;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  department: string;
  bio: string;
  photoURL: string;
  experience: string;
  blockedSlots?: { date: string; time: string }[];
}

export interface Department {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Appointment {
  id: string;
  userId: string;
  doctorId: string;
  doctorName?: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  reminderSent?: boolean;
  createdAt: any;
}

export interface Report {
  id: string;
  userId: string;
  title: string;
  description?: string;
  fileURL: string;
  uploadedAt: any;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  content: string;
  timestamp: any;
}
