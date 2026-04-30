import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { addDays, format } from 'date-fns';

// Import config directly
import { readFile } from 'fs/promises';
const firebaseConfig = JSON.parse(await readFile(new URL('./firebase-applet-config.json', import.meta.url), 'utf-8'));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Admin
  let firebaseAdminApp;
  if (admin.apps.length === 0) {
    firebaseAdminApp = admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  } else {
    firebaseAdminApp = admin.app();
  }
  
  // Use specific database if provided via the modular getFirestore
  const adminDb = firebaseConfig.firestoreDatabaseId 
    ? getFirestore(firebaseAdminApp, firebaseConfig.firestoreDatabaseId)
    : getFirestore(firebaseAdminApp);

  app.use(express.json());

  // API Route for Reminders
  app.post("/api/admin/trigger-reminders", async (req, res) => {
    try {
      console.log("Triggering appointment reminders...");
      
      const tomorrow = addDays(new Date(), 1);
      const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
      
      // Query appointments for tomorrow that haven't had a reminder sent
      // Note: using '==' for date and '==' for status.
      // reminderSent: undefined or false
      const snapshot = await adminDb.collection('appointments')
        .where('date', '==', tomorrowStr)
        .where('status', '==', 'confirmed')
        .get();
      
      const processed = [];
      const batch = adminDb.batch();

      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Skip if reminder already sent
        if (data.reminderSent === true) continue;

        const userId = data.userId;
        
        // Fetch user info for reminder
        const userDoc = await adminDb.collection('users').doc(userId).get();
        const userData = userDoc.data();
        
        if (userData) {
          const userName = userData.displayName || 'Patient';
          const email = userData.email;
          const phone = userData.phoneNumber || 'N/A';
          
          const message = `Reminder: Hi ${userName}, you have an appointment tomorrow (${tomorrowStr}) at ${data.time} at Hopekim Hospital. See you soon!`;
          
          // Log the "sending" action (simulation)
          console.log(`[SIMULATION] Sending reminder to ${email} / ${phone}`);
          console.log(`[MESSAGE] ${message}`);
          
          // In a real implementation:
          // await sendEmail(email, "Appointment Reminder", message);
          // if (phone !== 'N/A') await sendSMS(phone, message);
          
          batch.update(doc.ref, { 
            reminderSent: true,
            updatedAt: FieldValue.serverTimestamp()
          });
          
          processed.push({
            id: doc.id,
            user: userName,
            email: email,
            time: data.time
          });
        }
      }

      if (processed.length > 0) {
        await batch.commit();
      }
      
      res.json({ 
        success: true, 
        message: `Processed ${processed.length} reminders.`,
        details: processed
      });
    } catch (error: any) {
      console.error("Reminder Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
