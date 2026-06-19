import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

import { firebaseConfig, isFirebaseAuthConfigured } from './config'

/**
 * Firebase 앱 + Auth 싱글턴 — HMR 안전 + 지연 초기화.
 *
 * 1) HMR 안전: Vite dev 의 모듈 핫리로드로 이 파일이 재평가돼도 `initializeApp` 을 다시
 *    부르면 "Firebase App named '[DEFAULT]' already exists" 가 난다. 이미 초기화돼 있으면
 *    `getApp()` 으로 재사용한다.
 * 2) 지연 초기화: env(VITE_FIREBASE_*) 미설정이면 `getAuth()` 가 Node/jsdom 플랫폼에서
 *    `auth/invalid-api-key` 로 즉시 throw 한다(브라우저보다 엄격). 이 모듈을 import 만 해도
 *    터지면 앱 전체 렌더/테스트가 깨지므로, `auth` 는 **첫 사용 시점에** 생성한다.
 *    실제 사용처(AuthProvider)는 항상 `isFirebaseAuthConfigured` 로 가드하므로,
 *    미설정 상태에서 이 지연 생성이 트리거되는 일은 없다(안전한 친절 degrade).
 */
function initAuth(): Auth {
  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)
  return getAuth(app)
}

let authSingleton: Auth | null = null

/** 설정된 경우에만 `getAuth` 를 호출해 Auth 싱글턴을 반환한다(가드 밖 호출 시 throw). */
function resolveAuth(): Auth {
  if (!isFirebaseAuthConfigured) {
    throw new Error('Firebase Auth 가 설정되지 않았습니다(VITE_FIREBASE_* 미설정).')
  }
  authSingleton ??= initAuth()
  return authSingleton
}

/**
 * 지연 Auth 프록시 — `import { auth }` 의 값 시맨틱을 유지하면서, 실제 Auth 객체 접근
 * 시점까지 `getAuth()` 호출을 미룬다(정본 모듈의 `auth` 사용처를 그대로 둘 수 있다).
 */
export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    return Reflect.get(resolveAuth() as object, prop, receiver) as unknown
  },
  set(_target, prop, value, receiver) {
    return Reflect.set(resolveAuth() as object, prop, value, receiver)
  },
})
