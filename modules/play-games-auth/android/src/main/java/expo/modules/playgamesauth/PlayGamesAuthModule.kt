package expo.modules.playgamesauth

import android.app.Activity
import android.os.Handler
import android.os.Looper
import com.google.android.gms.games.PlayGames
import com.google.android.gms.games.PlayGamesSdk
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PlayGamesAuthProvider
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PlayGamesAuthModule : Module() {
  private var sdkInitialized = false
  private val mainHandler = Handler(Looper.getMainLooper())

  override fun definition() = ModuleDefinition {
    Name("PlayGamesAuth")

    OnCreate {
      ensureSdkInitialized()
    }

    AsyncFunction("isAuthenticated") { promise: Promise ->
      val activity = currentActivityOrReject(promise) ?: return@AsyncFunction
      ensureSdkInitialized()

      PlayGames.getGamesSignInClient(activity)
        .isAuthenticated
        .addOnCompleteListener { task ->
          if (!task.isSuccessful) {
            promise.resolve(false)
            return@addOnCompleteListener
          }
          val result = task.result
          promise.resolve(result != null && result.isAuthenticated)
        }
    }

    /**
     * Sign in with Play Games (silent first, interactive if requested),
     * request a server auth code, then sign into Firebase Auth via
     * PlayGamesAuthProvider. Shares the same native FirebaseAuth instance
     * as @react-native-firebase/auth.
     */
    AsyncFunction("signInWithFirebase") { webClientId: String, interactive: Boolean, promise: Promise ->
      val activity = currentActivityOrReject(promise) ?: return@AsyncFunction
      ensureSdkInitialized()

      if (webClientId.isBlank()) {
        promise.reject("E_CONFIG", "Missing Firebase web client ID for Play Games server auth.", null)
        return@AsyncFunction
      }

      val gamesClient = PlayGames.getGamesSignInClient(activity)

      fun requestServerAuthAndFirebase() {
        gamesClient
          .requestServerSideAccess(webClientId, /* forceRefreshToken= */ false)
          .addOnCompleteListener { authCodeTask ->
            if (!authCodeTask.isSuccessful) {
              val err = authCodeTask.exception
              promise.reject(
                "E_SERVER_AUTH",
                err?.message
                  ?: "Play Games requestServerSideAccess failed. Enable Play Games provider in Firebase and link Game Server OAuth client in Play Console.",
                err,
              )
              return@addOnCompleteListener
            }

            val serverAuthCode = authCodeTask.result
            if (serverAuthCode.isNullOrBlank()) {
              promise.reject("E_SERVER_AUTH", "Play Games returned an empty server auth code.", null)
              return@addOnCompleteListener
            }

            val credential = PlayGamesAuthProvider.getCredential(serverAuthCode)
            FirebaseAuth.getInstance()
              .signInWithCredential(credential)
              .addOnCompleteListener { firebaseTask ->
                if (!firebaseTask.isSuccessful) {
                  val err = firebaseTask.exception
                  promise.reject(
                    "E_FIREBASE",
                    err?.message
                      ?: "Firebase Play Games sign-in failed. Enable the Play Games provider in Firebase Authentication.",
                    err,
                  )
                  return@addOnCompleteListener
                }

                val user = FirebaseAuth.getInstance().currentUser
                if (user == null) {
                  promise.reject("E_FIREBASE", "Firebase Auth succeeded but currentUser is null.", null)
                  return@addOnCompleteListener
                }

                promise.resolve(
                  mapOf(
                    "uid" to user.uid,
                    "displayName" to user.displayName,
                    "email" to user.email,
                    "photoURL" to user.photoUrl?.toString(),
                  ),
                )
              }
          }
      }

      fun afterPlayGamesAuthenticated(authenticated: Boolean) {
        if (!authenticated) {
          promise.reject(
            "E_NOT_AUTHENTICATED",
            "Play Games sign-in was not completed.",
            null,
          )
          return
        }
        requestServerAuthAndFirebase()
      }

      /**
       * PGS v2 auto-authenticates after PlayGamesSdk.initialize(), but that
       * often completes *after* JS cold-start silent sign-in. Poll briefly
       * before giving up (or falling through to interactive signIn).
       */
      fun waitForPlayGamesAuth(attempt: Int) {
        gamesClient.isAuthenticated.addOnCompleteListener { authCheck ->
          val alreadyIn =
            authCheck.isSuccessful &&
              authCheck.result != null &&
              authCheck.result.isAuthenticated

          if (alreadyIn) {
            afterPlayGamesAuthenticated(true)
            return@addOnCompleteListener
          }

          // ~8 × 400ms ≈ 3.2s window for auto-auth after SDK init
          if (attempt < 8) {
            mainHandler.postDelayed({ waitForPlayGamesAuth(attempt + 1) }, 400L)
            return@addOnCompleteListener
          }

          if (!interactive) {
            promise.reject(
              "E_SILENT_FAILED",
              "Play Games silent sign-in is not available yet.",
              null,
            )
            return@addOnCompleteListener
          }

          gamesClient.signIn().addOnCompleteListener { signInTask ->
            val result = signInTask.result
            val ok = signInTask.isSuccessful && result != null && result.isAuthenticated
            afterPlayGamesAuthenticated(ok)
          }
        }
      }

      waitForPlayGamesAuth(0)
    }

    AsyncFunction("signOutFirebase") { promise: Promise ->
      try {
        FirebaseAuth.getInstance().signOut()
        promise.resolve(null)
      } catch (err: Exception) {
        promise.reject("E_SIGNOUT", err.message, err)
      }
    }
  }

  private fun ensureSdkInitialized() {
    if (sdkInitialized) return
    val context = appContext.reactContext ?: return
    PlayGamesSdk.initialize(context)
    sdkInitialized = true
  }

  private fun currentActivityOrReject(promise: Promise): Activity? {
    val activity = appContext.currentActivity
    if (activity == null) {
      promise.reject("E_NO_ACTIVITY", "No current Android activity for Play Games sign-in.", null)
      return null
    }
    return activity
  }
}
