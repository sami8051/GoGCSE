import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit, Timestamp, doc, updateDoc, deleteDoc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { ExamResult, PaperType, ExamPaper, StudentAnswer } from "../types";

const firebaseConfig = {
    apiKey: "AIzaSyCEEQBoSXPKiG0mEX_H6bA1aSn072FD_DA",
    authDomain: "gcse-a7ffe.firebaseapp.com",
    projectId: "gcse-a7ffe",
    storageBucket: "gcse-a7ffe.firebasestorage.app",
    messagingSenderId: "266952172762",
    appId: "1:266952172762:web:9ef234cf67a8ab32afb1e3"
};

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// --- ADMIN CONFIGURATION ---
// Add email addresses here to grant admin access to the platform.
export const ADMIN_EMAILS = [
    'testadmin@example.com',
    'sami8051@gmail.com',
    // Add more admin emails below:
];

// --- SUPER ADMIN CONFIGURATION ---
// Only these users can access System Settings in the admin panel.
export const SUPER_ADMIN_EMAILS = [
    'sami8051@gmail.com',
    // Add more super admin emails below:
];

// --- CONSENT DATA TYPES ---
export interface UserConsent {
    userId: string;
    email: string;
    ageGroup: 'under13' | '13-15' | '16-17' | '18+' | 'parent' | 'teacher';
    consents: {
        termsAndPrivacy: {
            accepted: boolean;
            version: string;
            timestamp: Date;
        };
        educationalDisclaimer: {
            accepted: boolean;
            version: string;
            timestamp: Date;
        };
        parentalConfirmation?: {
            confirmed: boolean;
            timestamp: Date;
        };
        marketingOptIn: {
            accepted: boolean;
            timestamp: Date | null;
        };
    };
    metadata?: {
        ipAddress: string;
        userAgent: string;
        country: string;
    };
    createdAt: Date;
}

// Current version of legal documents (update when terms change)
export const LEGAL_VERSIONS = {
    terms: '1.0',
    privacy: '1.0',
    educationalDisclaimer: '1.0'
};

// --- CONSENT LOGGING ---

// Check if a user has already consented to the current version
export const checkUserConsent = async (userId: string): Promise<boolean> => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            const data = userDoc.data();
            // Check if consented AND version matches current required version
            return data.hasConsented === true && data.consentVersion === LEGAL_VERSIONS.terms;
        }
        return false;
    } catch (error) {
        console.error("Error checking consent:", error);
        return false;
    }
};

// Check if user is an admin based on Firestore profile
export const checkIsAdmin = async (userId: string): Promise<boolean> => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        return userDoc.exists() && userDoc.data().isAdmin === true;
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
};

// Check if user is a teacher based on Firestore profile
export const checkIsTeacher = async (userId: string): Promise<boolean> => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        return userDoc.exists() && userDoc.data().isTeacher === true;
    } catch (error) {
        console.error("Error checking teacher status:", error);
        return false;
    }
};

export const saveUserConsent = async (
    userId: string,
    email: string,
    ageGroup: UserConsent['ageGroup'],
    termsAccepted: boolean,
    disclaimerAccepted: boolean,
    parentalConfirmed: boolean,
    marketingOptIn: boolean,
    signUpMethod: 'email' | 'google' | 'other' = 'email'
) => {
    try {
        const now = new Date();

        // Capture metadata for audit trail
        let ipAddress = 'unknown';
        try {
            const ipRes = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipRes.json();
            ipAddress = ipData.ip;
        } catch (e) {
            console.warn('Could not fetch IP for consent log');
        }

        const userAgent = navigator.userAgent;

        const consentData: UserConsent = {
            userId,
            email,
            ageGroup,
            consents: {
                termsAndPrivacy: {
                    accepted: termsAccepted,
                    version: LEGAL_VERSIONS.terms,
                    timestamp: now
                },
                educationalDisclaimer: {
                    accepted: disclaimerAccepted,
                    version: LEGAL_VERSIONS.educationalDisclaimer,
                    timestamp: now
                },
                marketingOptIn: {
                    accepted: marketingOptIn,
                    timestamp: marketingOptIn ? now : null
                }
            },
            metadata: {
                ipAddress,
                userAgent,
                country: 'UK' // Default assumption, could be fetched via IP
            },
            createdAt: now
        };

        // Add parental confirmation for minors
        if (ageGroup === '13-15') {
            consentData.consents.parentalConfirmation = {
                confirmed: parentalConfirmed,
                timestamp: now
            };
        }

        // Save detailed record to userConsents collection (immutable log)
        await setDoc(doc(db, 'userConsents', userId), {
            ...consentData,
            signUpMethod,
            consentSourcePage: 'signup-consent-v1'
        });

        // Also update user profile with consent reference for fast lookup
        await setDoc(doc(db, 'users', userId), {
            hasConsented: true,
            consentVersion: LEGAL_VERSIONS.terms,
            ageGroup,
            signUpMethod, // Useful to know how they signed up
            marketingOptIn,
            lastConsentUpdate: serverTimestamp()
        }, { merge: true });

        console.log('Consent saved for user:', userId);
        return true;
    } catch (error) {
        console.error('Failed to save consent:', error);
        return false;
    }
};

// Update user consent with additional fields (e.g., AI disclaimer acceptance)
export const updateUserConsent = async (userId: string, updates: Record<string, any>) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, updates);
        console.log('User consent updated for user:', userId);
        return true;
    } catch (error) {
        console.error('Failed to update user consent:', error);
        return false;
    }
};

// --- ACTIVITY LOGGING ---
export const logAdminAction = async (
    action: string,
    actionType: 'create' | 'update' | 'delete' | 'setting' | 'other',
    targetType?: string,
    targetId?: string,
    details?: string
) => {
    try {
        await addDoc(collection(db, 'activityLogs'), {
            action,
            actionType,
            userId: auth.currentUser?.uid || 'unknown',
            userEmail: auth.currentUser?.email || 'unknown',
            targetType,
            targetId,
            details,
            timestamp: serverTimestamp()
        });
    } catch (e) {
        console.error('Failed to log admin action', e);
    }
};

export const logLoginEvent = async (email: string, success: boolean, reason?: string) => {
    try {
        await addDoc(collection(db, 'loginEvents'), {
            email,
            userId: auth.currentUser?.uid || 'unknown',
            success,
            reason,
            timestamp: serverTimestamp()
        });
    } catch (e) {
        console.error('Failed to log login event', e);
    }
};

export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Error signing in", error);
        throw error;
    }
};

export const registerWithEmailAndPassword = async (name: string, email: string, password: string) => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, {
            displayName: name
        });
        return result.user;
    } catch (error) {
        console.error("Error registering", error);
        throw error;
    }
};

export const sendVerification = async () => {
    if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
    }
};

export const updateUserProfile = async (user: any, data: { displayName?: string, photoURL?: string }) => {
    try {
        await updateProfile(user, data);
        return true;
    } catch (error) {
        console.error("Error updating profile", error);
        throw error;
    }
};

export const uploadProfilePicture = async (user: any, file: File) => {
    try {
        const storageRef = ref(storage, `profile_pictures/${user.uid}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        await updateUserProfile(user, { photoURL: downloadURL });
        return downloadURL;
    } catch (error) {
        console.error("Error uploading profile picture", error);
        throw error;
    }
};

export const logInWithEmailAndPassword = async (email, password) => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    } catch (error) {
        console.error("Error signing in with password", error);
        throw error;
    }
};

export const logOut = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out", error);
        throw error;
    }
};

// Database Helpers

// Database Helpers

export const saveExamResult = async (userId: string, result: ExamResult, paper: ExamPaper, answers: Record<string, StudentAnswer>) => {
    try {
        // Create a basic serializable object to avoid "custom object" errors with Firestore
        const docData = {
            userId,
            ...result, // Spread all fields from ExamResult (totalScore, maxScore, gradeEstimate, questionResults, etc.)
            // Maintain score for backward compatibility in dashboard list view
            score: result.totalScore,
            date: Timestamp.now(),
            paperData: paper, // Save the full exam paper data
            fullAnswers: answers // Save full student answer metadata (timestamps, flags, etc.)
        };

        // Add a timeout to prevent indefinite hangs
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Firestore save timed out")), 10000)
        );

        const addDocPromise = addDoc(collection(db, "examResults"), docData);

        // Race the save against the timeout
        const docRef: any = await Promise.race([addDocPromise, timeoutPromise]);

        console.log("Document written with ID: ", docRef.id);
        return docRef.id;
    } catch (e: any) {
        console.error("Error adding document: ", e);
        // Don't re-throw, just log, so the app doesn't crash if save fails
        return null;
    }
};

export const updateExamWithPdf = async (docId: string, pdfUrl: string) => {
    try {
        const docRef = doc(db, "examResults", docId);
        await updateDoc(docRef, { pdfUrl });
        console.log("Updated document with PDF URL");
    } catch (e) {
        console.error("Error updating PDF URL", e);
    }
};

export const deleteExamResult = async (docId: string) => {
    try {
        const docRef = doc(db, "examResults", docId);
        await deleteDoc(docRef);
        console.log("Document deleted with ID: ", docId);
        return true;
    } catch (e) {
        console.error("Error deleting document: ", e);
        return false;
    }
};

export const uploadExamPdf = async (userId: string, examId: string, pdfBlob: Blob) => {
    try {
        const storageRef = ref(storage, `exam-pdfs/${userId}/${examId}.pdf`);
        await uploadBytes(storageRef, pdfBlob);
        const downloadUrl = await getDownloadURL(storageRef);
        console.log("PDF Uploaded to:", downloadUrl);
        return downloadUrl;
    } catch (e) {
        console.error("Error uploading PDF", e);
        return null;
    }
};

export const getUserHistory = async (userId: string) => {
    console.time("fetchHistory");
    try {
        // PERF FIX: Removed orderBy/limit from query to avoid "Missing Index" error
        // Fetch all user results and sort client-side (dataset is small enough)
        const q = query(
            collection(db, "examResults"),
            where("userId", "==", userId)
        );

        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Client-side sort (Newest first)
        // Handle both Firestore Timestamp (seconds) and legacy string dates
        docs.sort((a: any, b: any) => {
            const getMillis = (d: any) => {
                if (!d) return 0;
                if (d.seconds) return d.seconds * 1000; // Firestore Timestamp
                return new Date(d).getTime(); // String ISO
            };
            return getMillis(b.date) - getMillis(a.date);
        });

        console.timeEnd("fetchHistory");
        return docs.slice(0, 20); // Return top 20
    } catch (e) {
        console.timeEnd("fetchHistory");
        console.error("Error fetching history: ", e);
        return [];
    }
};

export const saveLabSession = async (userId: string, method: string, text: string, feedback: any) => {
    try {
        await addDoc(collection(db, "labSessions"), {
            userId,
            method,
            text,
            feedback,
            date: Timestamp.now()
        });
        return true;
    } catch (e) {
        console.error("Error saving lab session:", e);
        return false;
    }
};

// --- User Sync for Admin ---

export const syncUserProfile = async (user: any) => {
    if (!user) return;
    try {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user?.displayName || user?.email?.split('@')[0],
            photoURL: user.photoURL,
            lastActive: Timestamp.now(),
            // Default approval logic: Admins are auto-approved, others depend on existing status or default to FALSE
            // We use setDoc with merge: true, so we must be careful not to overwrite existing TRUE values with FALSE.
            // However, for a NEW user (or one without the field), we want to set a default.
            // The safest way with merge is to only set it if we determine it's a new user logic, 
            // but here we can just rely on the fact that if it's undefined in Firestore, we want a default.
            // Actually, querying it first is safer to avoid overwriting, but for now we'll rely on the update logic:
            // logic: if user is admin -> trusted. 
        }, { merge: true });

        // Separate update for 'isApproved' to ensure we don't overwrite it if it exists
        // This is a bit inefficient (2 writes), but safer than reading first in this context without changing structure too much.
        // Actually, let's just do a check. Since we don't want to constantly read, let's assume valid admins are always approved.
        // For regular users, we only want to set 'isApproved = false' IF IT DOES NOT EXIST.
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            const data = snap.data();
            const isAdmin = ADMIN_EMAILS.includes(user.email);

            // Sync Admin/Approval status based on email list
            if (isAdmin && (!data.isAdmin || !data.isApproved)) {
                await updateDoc(userRef, { isAdmin: true, isApproved: true });
            } else if (data.isAdmin === undefined || data.isApproved === undefined) {
                // Initial fields for non-admins if missing
                await updateDoc(userRef, {
                    isAdmin: data.isAdmin ?? false,
                    isApproved: data.isApproved ?? false
                });
            }
        } else {
            // First time profile creation
            const isAdmin = ADMIN_EMAILS.includes(user.email);
            await updateDoc(userRef, {
                isAdmin: isAdmin,
                isApproved: isAdmin
            });
        }
    } catch (error) {
        console.error("Error syncing user profile:", error);
    }
};

export const updateUserStatus = async (userId: string, isApproved: boolean) => {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { isApproved });
        return true;
    } catch (error) {
        console.error("Error updating user status:", error);
        return false;
    }
};

// --- Admin Services ---

export const getAllUsers = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } catch (e) {
        console.error("Admin: Error fetching users", e);
        return [];
    }
};

export const getAllExamResults = async () => {
    try {
        // Fetch recently created exams first
        const q = query(collection(db, "examResults"), orderBy("date", "desc"), limit(100));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Admin: Error fetching exam results", e);
        return [];
    }
};

export const updateExamResultData = async (docId: string, updates: Partial<ExamResult>) => {
    try {
        const docRef = doc(db, "examResults", docId);
        await updateDoc(docRef, updates);
        return true;
    } catch (e) {
        console.error("Admin: Error updating exam", e);
        return false;
    }
};

export const deleteUserData = async (userId: string) => {
    try {
        // 1. Delete user doc
        await deleteDoc(doc(db, "users", userId));

        // 2. Delete all exam results for this user
        const q = query(collection(db, "examResults"), where("userId", "==", userId));
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);

        return true;
    } catch (e) {
        console.error("Admin: Error deleting user data", e);
        return false;
    }
};
