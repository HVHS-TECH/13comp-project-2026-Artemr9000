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
from '/fb/fb_io.mjs';

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
}

window.onload = setup;