/**************************************************************/
// main.mjs
// Main entry point for index.html and register.html
// Written by Artem Rakhimov, Term 1 2025
/**************************************************************/
const COL_C = 'white';
const COL_B = '#CD7F32';
console.log('%c main.mjs', 'color: blue; background-color: white;');

/**************************************************************/
// Import Firebase functions and variables from fb_io.mjs
/**************************************************************/
import { fb_initialise, fb_login, fb_onAuthStateChanged, fb_logout, fb_write, fb_read, fb_readall, fb_updatedata, fb_register, fb_adminLogin, userDetails, admin, fb_checkAdminStatus, fb_grantAdminStatus} from '/fb/fb_io.mjs';

/**************************************************************/
// setup()
// Called by window.onload
// Initializes Firebase and handles form submission
// Input:  n/a
// Return: n/a
/**************************************************************/
function setup() {
    console.log('%c setup(): ', 'color: ' + COL_C + '; background-color: ' + COL_B + ';');

    // Expose functions to global scope
    window.fb_initialise = fb_initialise;
    window.fb_login = fb_login;
    window.fb_onAuthStateChanged = fb_onAuthStateChanged;
    window.fb_logout = fb_logout;
    window.fb_write = fb_write;
    window.fb_read = fb_read;
    window.fb_readall = fb_readall;
    window.fb_updatedata = fb_updatedata;
    window.fb_register = fb_register;
    window.fb_checkAdminStatus = fb_checkAdminStatus
    window.fb_adminLogin = fb_adminLogin;
    window.admin = admin; // Expose admin object to global scope
    window.userDetails = userDetails; // Expose userDetails to global scope

    // Initialize Firebase and check auth state

    fb_initialise();
    fb_grantAdminStatus('CZw4IostEMbIVL9V4Iupd7vRc2j1');
    fb_grantAdminStatus('bI0NNeT4Twhsu4ysjAvIimfKceH2');
 //     fb_onAuthStateChanged();

    // Handle register form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (event) => {
            event.preventDefault();

            // Check if user is logged in
            if (!userDetails.uid || userDetails.uid === 'n/a') {
                document.getElementById('errorMessage').textContent = 'Please log in first.';
                document.getElementById('errorMessage').style.display = 'block';
                window.location.href = '/html/login.html';
                return;
            }

            const gamename = document.getElementById('gName').value.trim();
            const age = parseInt(document.getElementById('age').value);

            // Validate inputs
            if (!gamename || isNaN(age) || age < 1) {
                document.getElementById('errorMessage').textContent = 'Please enter a valid game name and age.';
                document.getElementById('errorMessage').style.display = 'block';
                return;
            }

            // Update userDetails
            userDetails.gamename = gamename; // Changed from gameName
            userDetails.age = age;

            // Write to Firebase
            fb_write()
                .then(() => window.location.href = '/html/mainMenu.html')
                .catch((error) => {
                    document.getElementById('errorMessage').textContent = 'Error: ' + error.message;
                    document.getElementById('errorMessage').style.display = 'block';
                });
        });
    }
}

window.onload = setup;