// HRD Survey Pro - Firebase Client Configuration
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentData,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Re-export Timestamp for use in other files
export { Timestamp };

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (singleton pattern)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// =============================================
// Authentication Functions (Master Only)
// =============================================

/**
 * Master login with email and password
 */
export async function masterLogin(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { user: userCredential.user, error: null };
  } catch (error) {
    console.error("Login error:", error);
    return { user: null, error: (error as Error).message };
  }
}

/**
 * Logout
 */
export async function masterLogout() {
  try {
    await signOut(auth);
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get current user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// =============================================
// Firestore Collections
// =============================================

export const COLLECTIONS = {
  COURSES: "courses",
  SURVEYS: "surveys",
  QUESTIONS: "questions",
  RESPONSES: "responses",
} as const;

// =============================================
// Course Functions
// =============================================

export interface Course {
  id?: string;
  title: string;
  objectives?: string;
  content?: string;
  instructor?: string;
  trainingStartDate?: Date | Timestamp;
  trainingEndDate?: Date | Timestamp;
  targetParticipants?: number;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

export async function getCourses(): Promise<Course[]> {
  const q = query(
    collection(db, COLLECTIONS.COURSES),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Course);
}

export async function getCourse(id: string): Promise<Course | null> {
  const docRef = doc(db, COLLECTIONS.COURSES, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Course;
}

export async function createCourse(
  data: Omit<Course, "id" | "createdAt" | "updatedAt">
) {
  const now = Timestamp.now();
  // Remove undefined values (Firebase doesn't accept undefined)
  const cleanData: Record<string, unknown> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  });
  const docRef = await addDoc(collection(db, COLLECTIONS.COURSES), {
    ...cleanData,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateCourse(id: string, data: Partial<Course>) {
  const docRef = doc(db, COLLECTIONS.COURSES, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteCourse(id: string) {
  const docRef = doc(db, COLLECTIONS.COURSES, id);
  await deleteDoc(docRef);
}

// =============================================
// Survey Functions
// =============================================

export interface Survey {
  id?: string;
  courseId?: string;
  title: string;
  description?: string;
  status: "draft" | "active" | "closed";
  uniqueCode: string;
  scaleType: 5 | 7 | 9 | 10;
  isAnonymous: boolean; // true: 무기명, false: 기명
  startDate?: Date | Timestamp;
  endDate?: Date | Timestamp;
  createdAt: Date | Timestamp;
  closedAt?: Date | Timestamp;
  // AI Analysis results (saved after AI analysis)
  aiSummary?: string;
  aiInsights?: string[];
  aiRecommendations?: string[];
  aiAnalyzedAt?: Date | Timestamp;
}

export async function getSurveys(): Promise<Survey[]> {
  const q = query(
    collection(db, COLLECTIONS.SURVEYS),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Survey);
}

export async function getSurvey(id: string): Promise<Survey | null> {
  const docRef = doc(db, COLLECTIONS.SURVEYS, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Survey;
}

export async function getSurveyByCode(code: string): Promise<Survey | null> {
  const q = query(
    collection(db, COLLECTIONS.SURVEYS),
    where("uniqueCode", "==", code),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Survey;
}

export async function createSurvey(data: Omit<Survey, "id" | "createdAt">) {
  const now = Timestamp.now();
  // Remove undefined values (Firebase doesn't accept undefined)
  const cleanData: Record<string, unknown> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  });
  const docRef = await addDoc(collection(db, COLLECTIONS.SURVEYS), {
    ...cleanData,
    createdAt: now,
  });
  return docRef.id;
}

export async function updateSurvey(id: string, data: Partial<Survey>) {
  const docRef = doc(db, COLLECTIONS.SURVEYS, id);
  await updateDoc(docRef, data);
}

export async function deleteSurvey(id: string) {
  const docRef = doc(db, COLLECTIONS.SURVEYS, id);
  await deleteDoc(docRef);
}

// =============================================
// Question Functions
// =============================================

export interface Question {
  id?: string;
  surveyId: string;
  type: "choice" | "text";
  category?: string;
  content: string;
  orderNum: number;
  isRequired: boolean;
  createdAt: Date | Timestamp;
}

export async function getQuestions(surveyId: string): Promise<Question[]> {
  const q = query(
    collection(db, COLLECTIONS.QUESTIONS),
    where("surveyId", "==", surveyId),
    orderBy("orderNum", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as Question
  );
}

export async function createQuestion(data: Omit<Question, "id" | "createdAt">) {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, COLLECTIONS.QUESTIONS), {
    ...data,
    createdAt: now,
  });
  return docRef.id;
}

export async function updateQuestion(id: string, data: Partial<Question>) {
  const docRef = doc(db, COLLECTIONS.QUESTIONS, id);
  await updateDoc(docRef, data);
}

export async function deleteQuestion(id: string) {
  const docRef = doc(db, COLLECTIONS.QUESTIONS, id);
  await deleteDoc(docRef);
}

export async function deleteQuestionsBySurvey(surveyId: string) {
  const q = query(
    collection(db, COLLECTIONS.QUESTIONS),
    where("surveyId", "==", surveyId)
  );
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}

// =============================================
// Response Functions (No Auth Required)
// =============================================

export interface Response {
  id?: string;
  surveyId: string;
  sessionId: string;
  respondentName?: string; // 기명 설문인 경우 응답자 이름
  answers: Answer[];
  deviceInfo?: DocumentData;
  submittedAt: Date | Timestamp;
}

export interface Answer {
  questionId: string;
  scoreValue?: number;
  textValue?: string;
}

export async function getResponses(surveyId: string): Promise<Response[]> {
  // Simple query without orderBy to avoid needing composite index
  const q = query(
    collection(db, COLLECTIONS.RESPONSES),
    where("surveyId", "==", surveyId)
  );
  const snapshot = await getDocs(q);
  const responses = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as Response
  );
  // Sort in memory by submittedAt descending
  return responses.sort((a, b) => {
    const aTime =
      a.submittedAt instanceof Timestamp
        ? a.submittedAt.toMillis()
        : new Date(a.submittedAt as unknown as string).getTime();
    const bTime =
      b.submittedAt instanceof Timestamp
        ? b.submittedAt.toMillis()
        : new Date(b.submittedAt as unknown as string).getTime();
    return bTime - aTime;
  });
}

export async function createResponse(data: Omit<Response, "id">) {
  const docRef = await addDoc(collection(db, COLLECTIONS.RESPONSES), data);
  return docRef.id;
}

export async function checkDuplicateResponse(
  surveyId: string,
  sessionId: string
): Promise<boolean> {
  const q = query(
    collection(db, COLLECTIONS.RESPONSES),
    where("surveyId", "==", surveyId),
    where("sessionId", "==", sessionId),
    limit(1)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// =============================================
// Utility Functions
// =============================================

/**
 * Generate unique survey code
 */
export function generateSurveyCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate session ID for survey responses
 */
export function generateSessionId(): string {
  const fingerprint = [
    typeof navigator !== "undefined" ? navigator.userAgent : "",
    typeof navigator !== "undefined" ? navigator.language : "",
    typeof screen !== "undefined" ? screen.width : 0,
    typeof screen !== "undefined" ? screen.height : 0,
    new Date().getTimezoneOffset(),
  ].join("|");

  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const random = Math.random().toString(36).substring(2, 15);
  return `${Math.abs(hash).toString(36)}-${random}-${Date.now().toString(36)}`;
}

/**
 * Convert Firestore Timestamp to Date
 */
export function timestampToDate(
  timestamp: Timestamp | Date | undefined
): Date | undefined {
  if (!timestamp) return undefined;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
}

// Export Firebase app
export default app;
