/**************************************************************/
// main.mjs
// Main entry point for index.html and register.html
// Written by Artem Rakhimov, Term 1 2025
/**************************************************************/

const COL_C = 'white';
const COL_B = '#CD7F32';
console.log('%c main.mjs', 'color: blue; background-color: white;');

/**************************************************************/
// Imports from fb_io.mjs
/**************************************************************/
import { fb_initialise, fb_login, fb_onAuthStateChanged, fb_logout, fb_write, fb_read, fb_readall, fb_updatedata, fb_register, fb_adminLogin, userDetails, admin, fb_checkAdminStatus, fb_grantAdminStatus } 
from '../fb/fb_io.mjs';

/**************************************************************/
// setup()
// Initializes Firebase and handles form submission
// Input:  none
// Return: none
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
    window.fb_checkAdminStatus = fb_checkAdminStatus;
    window.fb_adminLogin = fb_adminLogin;
    window.admin = admin;
    window.userDetails = userDetails;
    

    // Initialize Firebase
    fb_initialise();
    fb_onAuthStateChanged();
    fb_grantAdminStatus('CZw4IostEMbIVL9V4Iupd7vRc2j1');
   
    // Check auth state on specific pages
    const currentPage = window.location.pathname;
    if (currentPage === '../index.html' || currentPage === '../html') {
        // Monitor auth state and check admin status on index.html
        fb_onAuthStateChanged((uid) => {
            if (uid !== 'n/a') {
                fb_checkAdminStatus(uid);
            } else {
                console.log('No user logged in, staying on current page');
            }
        });
    } else if (currentPage === '../html/register.html') {
        // Monitor auth state on register.html to restore userDetails, but don't check admin status
        fb_onAuthStateChanged((uid) => {
            if (uid !== 'n/a') {
                console.log('User logged in on register page:', userDetails);
            } else {
                console.log('No user logged in, redirecting to index');
                window.location.href = '/index.html';
            }
        });
    }

    // Handle register form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (event) => {
            event.preventDefault();

            // Check if user is logged in
            if (!userDetails.uid || userDetails.uid === 'n/a') {
                document.getElementById('errorMessage').textContent = 'Please log in first.';
                document.getElementById('errorMessage').style.display = 'block';
                window.location.href = '../index.html';
                return;
            }

            const gameName = document.getElementById('gName').value.trim();
            const age = parseInt(document.getElementById('age').value);
            const contry = document.getElementById('contry').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const address = document.getElementById('address').value.trim();

            // Validate inputs - making sure nothing is blank or weird
            if (!gameName || isNaN(age) || age < 5 || !contry || !phone || !address) {
                document.getElementById('errorMessage').textContent = 'Please fill in all fields with valid info.';
                document.getElementById('errorMessage').style.display = 'block';
                return;
            }

            // Update userDetails and write to Firebase
            fb_register(gameName, age, contry, phone, address)
                .then(() => window.location.href = '../html/mainMenu.html')
                .catch((error) => {
                    document.getElementById('errorMessage').textContent = `Error: ${error.message}`;
                    document.getElementById('errorMessage').style.display = 'block';
                });
        });
    }
}

window.onload = setup;