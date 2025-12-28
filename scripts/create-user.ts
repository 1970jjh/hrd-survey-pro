/**
 * Firebase 사용자 생성 스크립트
 * 실행: npx tsx scripts/create-user.ts
 */

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

// Firebase configuration - 환경변수에서 가져오기
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 생성할 사용자 정보
const NEW_USER = {
  email: "jj@jjcreative.co.kr",
  password: "00700",
  displayName: "JJ Creative",
};

async function createUser() {
  console.log("Firebase 초기화 중...");

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  console.log(`\n사용자 생성 중: ${NEW_USER.email}`);

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      NEW_USER.email,
      NEW_USER.password
    );

    // 프로필 업데이트 (displayName 설정)
    await updateProfile(userCredential.user, {
      displayName: NEW_USER.displayName,
    });

    console.log("\n✅ 사용자 생성 완료!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`이메일: ${NEW_USER.email}`);
    console.log(`비밀번호: ${NEW_USER.password}`);
    console.log(`UID: ${userCredential.user.uid}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    process.exit(0);
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };

    if (firebaseError.code === "auth/email-already-in-use") {
      console.log("\n⚠️ 이미 존재하는 이메일입니다.");
      console.log(`이메일: ${NEW_USER.email}`);
    } else if (firebaseError.code === "auth/weak-password") {
      console.log("\n❌ 비밀번호가 너무 약합니다. (최소 6자 이상)");
    } else {
      console.error("\n❌ 사용자 생성 실패:", firebaseError.message || error);
    }

    process.exit(1);
  }
}

createUser();
