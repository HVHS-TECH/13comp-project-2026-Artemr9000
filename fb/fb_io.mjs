/**************************************************************/
// fb_io.mjs
// Firebase I/O operations for 12COMP 2025 project
// Written by Artem Rakhimov, Term 1 2025
/**************************************************************/

const FB_COL_C = 'white';
const FB_COL_B = '#CD7F32';
console.log('%c fb_io.mjs', 'color: ' + FB_COL_C + '; background-color: ' + FB_COL_B + ';');

/**************************************************************/
// Imports for Firebase services
/**************************************************************/
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getDatabase, ref, set, get, update, query, orderByChild, limitToLast } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';

/**************************************************************/
// Global variables
/**************************************************************/
export let fb_gamedb;
export let userDetails = {
  displayName: 'n/a',
  email: 'n/a',
  photo: 'n/a',
  uid: 'n/a',
  gameName: 'n/a',
  age: 0,
  contry: 'n/a'
  
};
export let admin = {
  uid: 'n/a',
  isAdmin: false
};
export let userScore = {
  leaderScore: 0,
  uid: 'n/a'
};
let fb_dataArray = [];

/**************************************************************/
// fb_ initialize()
// Initializes Firebase with project configuration
// Input:  none
// Return: none
/**************************************************************/
export function fb_initialise() {
    console.log('%c fb_initialise(): ', `color: ${FB_COL_C}; background-color: ${FB_COL_B}`);
   
    const FB_GAMECONFIG = {
  apiKey: "AIzaSyCJJ8-ZerBC53qhRMzinJiPty2vk9tSsKc",
  authDomain: "artem-rakhimov-13comp-c7551.firebaseapp.com",
  databaseURL: "https://artem-rakhimov-13comp-c7551-default-rtdb.firebaseio.com",
  projectId: "artem-rakhimov-13comp-c7551",
  storageBucket: "artem-rakhimov-13comp-c7551.firebasestorage.app",
  messagingSenderId: "902104968011",
  appId: "1:902104968011:web:2cf4178eeb8c04428796ce"
  };
    
    const FB_GAMEAPP = initializeApp(FB_GAMECONFIG);
    fb_gamedb = getDatabase(FB_GAMEAPP);
    console.info('Firebase initialized:', fb_gamedb);
}

/**************************************************************/
// fb_ login()
// Authenticates user with Google Sign-In
// Input:  none
// Return: none
/**************************************************************/
export function fb_login() {
    console.log('%c fb_login(): ', `color: ${FB_COL_C}; background-color: ${FB_COL_B}`);
    console.log('Current session UID:', sessionStorage.getItem('uid'));
    const AUTH = getAuth();
    const PROVIDER = new GoogleAuthProvider();
    PROVIDER.setCustomParameters({ prompt: 'select_account' });
    signInWithPopup(AUTH, PROVIDER)
        .then((result) => {
            userDetails.displayName = result.user.displayName;
            userDetails.email = result.user.email;
            userDetails.photo = result.user.photoURL;
            userDetails.uid = result.user.uid;
            
            console.log('Logged in user:', userDetails);
            sessionStorage.setItem('uid', userDetails.uid);
            const userPath = `userDetails/${userDetails.uid}`;
            const userRef = ref(fb_gamedb, userPath);
            get(userRef).then((snapshot) => {
                if (snapshot.exists()) {
                    userDetails.gameName = snapshot.val().gameName
                     userDetails.age = snapshot.val().age
                       userDetails.contry = snapshot.val().contry
                    console.log('User data found, redirecting to main menu');
                    fb_checkAdminStatus(result.user.uid);
                } else {
                    console.log('No user data, redirecting to register');
                    window.location.href = '../html/register.html';
                }
            }).catch((error) => {
                console.error('Error checking user data:', error);
                alert(`Error accessing user data: ${error.message}`);
            });
        })
        .catch((error) => {
            console.error('Login error:', error);
            alert(`Login failed: ${error.message}`);
        });
}

/**************************************************************/
// fb_ monitor_auth_state()
// Monitors authentication state changes
// Input:  callback function
// Return: Firebase user object or null
/**************************************************************/
export function fb_onAuthStateChanged(callbackFn) {
    console.log('%c fb_onAuthStateChanged(): ', `color: ${FB_COL_C}; background-color: ${FB_COL_B}`);
    console.log('Am I an admin?', admin.isAdmin);
    const AUTH = getAuth();
    return onAuthStateChanged(AUTH, (user) => {
        if (user) {
            console.log(user);
            userDetails.displayName = user.displayName || 'n/a';
            userDetails.email = user.email || 'n/a';
            userDetails.photo = user.photoURL || 'n/a';
            userDetails.uid = user.uid || 'n/a';
            userDetails.gameName = user.gameName  || 'n/a';
            userDetails.age = user.age  || 'n/a'; 
             userDetails.contry = user.contry  || 'n/a'; 
            fb_read();
            sessionStorage.setItem('uid', userDetails.uid);
            console.log('Auth state: Logged in', userDetails);
            if (callbackFn) {
                callbackFn(userDetails.uid);
            }
        } else {
            userDetails = { displayName: 'n/a', email: 'n/a', photo: 'n/a', uid: 'n/a', gameName: 'n/a', age: 0,  contry: 'n/a'};
            admin = { uid: 'n/a', isAdmin: false };
            sessionStorage.removeItem('uid');
            sessionStorage.removeItem('admin');
            console.log('Auth state: Logged out');
        }
        return user;
    }, (error) => {
        console.error('Auth state error:', error);
        alert(`Auth state error: ${error.message}`);
    });
}

/**************************************************************/
// fb_ logout()
// Signs out the current user
// Input:  none
// Return: none
/**************************************************************/
export function fb_logout() {
    console.log('%c fb_logout(): ', `color: ${FB_COL_C}; background-color: ${FB_COL_B}`);
    const AUTH = getAuth();
    signOut(AUTH)
        .then(() => {
            userDetails = { displayName: 'n/a', email: 'n/a', photo: 'n/a', uid: 'n/a', gameName: 'n/a', age: 0, contry: 'n/a'};
            admin = { uid: 'n/a', isAdmin: false };
            sessionStorage.removeItem('uid');
            sessionStorage.removeItem('admin');
            console.log('User logged out successfully');
            window.location.href = '../index.html';
        })
        .catch((error) => {
            console.error('Logout error:', error);
            alert(`Logout failed: ${error.message}`);
        });
}

/**************************************************************/
// fb_ write()
// Writes user details to Firebase
// Input:  none
// Return: Promise
/**************************************************************/
export function fb_write() {
    console.log('%c fb_write(): ', `color: ${FB_COL_C}; background-color: ${FB_COL_B}`);
    const path = `userDetails/${userDetails.uid}`;
    console.log('Database path:', path);
    const dbRef = ref(fb_gamedb, path);
    return set(dbRef, userDetails)
        .then(() => {
            console.log('%c fb_write(): OK', `color: ${FB_COL_C}; background-color: ${FB_COL_B}`);
        })
        .catch((error) => {
            console.error('Write error:', error);
            throw error; // Let the caller handle the error
        });
}

/**************************************************************/
// fb_ read()
// Reads user details from Firebase
// Input:  none
// Return: Promise with user data or null
/**************************************************************/
export function fb_read() {
    console.log('%c fb_read(): ', `color: ${FB_COL_C}; background-color: ${FB_COL_B}`);
    const path = `userDetails/${userDetails.uid}`;
    const dbRef = ref(fb_gamedb, path);
    return get(dbRef).then((snapshot) => {
        let fb_data = snapshot.val();
        if (fb_data) {
            console.log('User data:', fb_data);
            Object.assign(userDetails, fb_data); // Update userDetails with fetched data
            return fb_data;
        } else {
            console.log('No record found for user');
            return null;
        }
    }).catch((error) => {
        console.error('Read error:', error);
        throw error;
    });
}

/**************************************************************/
// fb_ read_all()
// Reads all user details from Firebase
// Input:  none
// Return: Promise with array of user data
/**************************************************************/
export function fb_readall() {
    console.log('%c fb_readall(): ', `color: ${FB_COL_C}; background-color: ${FB_COL_B}`);
    const path = 'userDetails';
    const dbReference = ref(fb_gamedb, path);
    return get(dbReference).then((snapshot) => {
        fb_dataArray = [];
        let fb_data = snapshot.val();
        if (fb_data) {
            snapshot.forEach((childSnapshot) => {
                let childData = childSnapshot.val();
                fb_dataArray.push(childData);
            });
            console.table(fb_dataArray);
            return fb_dataArray;
        } else {
            console.log('No records found');
            return [];
        }
    }).catch((error) => {
        console.error('Read all error:', error);
        throw error;
    });
}

/**************************************************************/
// fb_ update_data()
// Updates user details in Firebase
// Input:  updates (object with fields to update)
// Return: Promise
/**************************************************************/
export function fb_updatedata(updates) {
    console.log('%c fb_updatedata(): ', `color: ${FB_COL_C}; background-color: ${FB_COL_B}`);
    const path = `userDetails/${userDetails.uid}`;
    const dbReference = ref(fb_gamedb, path);
    return update(dbReference, updates).then(() => {
        console.log('Updated user data:', updates);
    }).catch((error) => {
        console.error('Update error:', error);
        throw error;
    });
}

/**************************************************************/
// fb_ register()
// Registers a new user with game name and age
// Input:  gName (string), age (number)
// Return: Promise
/**************************************************************/
export function fb_register(gName, age, contry) {
    console.log('%c fb_register(): ', `color: ${FB_COL_C}; background-color: ${FB_COL_B}`);
    const path = `userDetails/${userDetails.uid}`;
    const dbRef = ref(fb_gamedb, path);
    userDetails.gameName = gName;
    userDetails.age = parseInt(age);
    userDetails.contry = contry;
    return set(dbRef, userDetails)
        .then(() => {
            console.log('User registered:', userDetails);
        })
        .catch((error) => {
            console.error('Register error:', error);
            throw error;
        });
}

/**************************************************************/
// fb_ admin_login()
// Authenticates admin with Google Sign-In
// Input:  none
// Return: Promise
/**************************************************************/
export function fb_adminLogin() {
    console.log('%c fb_adminLogin(): ', `color: ${FB_COL_C}; background-color: ${FB_COL_B}`);
    const AUTH = getAuth();
    const PROVIDER = new GoogleAuthProvider();
    PROVIDER.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(AUTH, PROVIDER)
        .then((result) => {
            admin.uid = result.user.uid;
            userDetails.displayName = result.user.displayName;
            userDetails.email = result.user.email;
            userDetails.photo = result.user.photoURL;
            userDetails.uid = result.user.uid;
            userDetails.gameName = result.user.gameName;
            console.log('Logged in admin:', admin);
            sessionStorage.setItem('uid', admin.uid);
            return fb_checkAdminStatus(admin.uid);
        })
        .catch((error) => {
            console.error('Admin login error:', error);
            alert(`Admin login failed: ${error.message}`);
            throw error;
        });
}

/**************************************************************/
// fb_ check_admin_status()
// Checks if a user has admin privileges
// Input:  uid (string)
// Return: Promise
/**************************************************************/
export function fb_checkAdminStatus(uid) {
    console.log('%c fb_checkAdminStatus(): ', `color: ${FB_COL_C}; background-color: ${FB_COL_B}`);
    const currentPage = window.location.pathname;
    if (currentPage === '../html/register.html' || currentPage === '../html/adminMainMenu.html') {
        console.log('Skipping admin check on register or admin page');
        return Promise.resolve();
    }
    const adminPath = `admin/${uid}`;
    const adminRef = ref(fb_gamedb, adminPath);
    console.log('Checking admin path:', adminPath);
    return get(adminRef).then((snapshot) => {
        if (snapshot.exists() && snapshot.val() === 'y') {
            admin.isAdmin = true;
            sessionStorage.setItem('admin', 'y');
            console.log('Admin verified:', admin);
            console.log("error")
            window.location.href = '../html/adminMainMenu.html';
        } else {
            admin.isAdmin = false;
            sessionStorage.setItem('admin', 'n');
            console.log('Non-admin user detected');
            window.location.href = '../html/mainMenu.html';
        }
    }).catch((error) => {
        console.error('Error checking admin status:', error);
        alert(`Error checking admin status: ${error.message}`);
        sessionStorage.setItem('admin', 'n');
        window.location.href = '../html/mainMenu.html';
    });
}

/**************************************************************/
// fb_ save_score()
// Saves user's score to leaderboard
// Input:  gameMode (string), score (number)
// Return: Promise
/**************************************************************/
export async function fb_saveScore(gameMode, score) {
    console.log('%c fb_saveScore(): ', `color: ${FB_COL_C}; background-color: ${FB_COL_B}`);
    const path = `leaderboard/${gameMode}/${userDetails.uid}`;
    const dbRef = ref(fb_gamedb, path);
    try {
        const snapshot = await get(dbRef);
        if (snapshot.exists() && snapshot.val().score >= score) {
            console.log(snapshot.val());
            console.log(userDetails);
            console.log('Existing score is higher, not saving');
            return;
        }
        await set(dbRef, {
            gameName: userDetails.gameName,
            score: score,
            uid: userDetails.uid,
            timestamp: Date.now()
        });
        console.log(`Score saved for ${userDetails.gameName}: ${score}`);
        debugger
        console.log(userDetails)
    } catch (error) {
        console.error('Error saving score:', error);
        alert(`Error saving score: ${error.message}`);
        throw error;
    }
}

/**************************************************************/
// fb_ get_leaderboard()
// Retrieves leaderboard data for a game mode
// Input:  gameMode (string), limit (number)
// Return: Promise with array of scores
/**************************************************************/
export async function fb_getLeaderboard(gameMode, limit) {
    const auth = getAuth();
    console.log(auth.currentUser);
    console.log('%c fb_getLeaderboard(): ', `color: ${FB_COL_C}; background-color: ${FB_COL_B}`);
    const path = `leaderboard/${gameMode}`;
    const dbRef = ref(fb_gamedb, path);
    const sortedQuery = query(dbRef, orderByChild('score'), limitToLast(limit));
    try {
        console.log(path)
        const snapshot = await get(sortedQuery);
        let scores = [];
        if (snapshot.exists()) {
            console.log(snapshot.val());
            snapshot.forEach((childSnapshot) => {
                
                scores.push(childSnapshot.val());
            });
            scores.reverse();
            //since the scores is limited by query, we don't need to limit it here
            return scores;
        } else {
            console.log('No leaderboard data found');
            return [];
        }
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        alert(`Error fetching leaderboard: ${error.message}`);
        throw error;
    }
}

/**************************************************************/
// fb_ grant_admin_status()
// Grants admin privileges to a user
// Input:  uid (string)
// Return: Promise
/**************************************************************/
export function fb_grantAdminStatus(uid) {
    console.log('%c fb_grantAdminStatus(): ', `color: ${FB_COL_C}; background-color: ${FB_COL_B}`);
    const adminPath = `admin/${uid}`;
    const adminRef = ref(fb_gamedb, adminPath);
    return set(adminRef, 'y') 
        .then(() => {
            console.log(`Admin status granted to UID: ${uid}`);
            if (uid === admin.uid) {
                admin.isAdmin = true;
                sessionStorage.setItem('admin', 'y');
            }
        })
        .catch((error) => {
            console.error('Error granting admin status:', error);
          
        });
}