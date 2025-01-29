import { UserManager, Log } from "oidc-client-ts";

// Set up logging for debugging
Log.setLogger(console);
Log.setLevel(Log.INFO);

// Cognito configuration
const cognitoConfig = {
  authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_m9CtZ8Zr3",
  client_id: "tj2n9mnpm20nn9d015ahkr7da",
  redirect_uri: `${window.location.origin}/`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  response_type: "code",
  scope: "email openid profile",
  automaticSilentRenew: false, // Disable silent renew for simplicity
};

// Create a UserManager instance
const userManager = new UserManager(cognitoConfig);

// // Get references to the HTML elements
// const signInButton = document.getElementById("signIn");
// const signOutButton = document.getElementById("signOut");

// Check if a user is already logged in
userManager.getUser().then((user) => {
  if (user) {
    updateUI(user);
    console.log("User is logged in:", user);
  } else {
    console.log("User is not logged in.");
  }
});

// Handle login
// signInButton.addEventListener("click", () => {
//   userManager.signinRedirect().then(() => {
//     console.log("Redirecting to Cognito for login...");
//   });
// });

// Handle logout
// signOutButton.addEventListener("click", () => {
//   userManager.removeUser().then(() => {
//     console.log("User session cleared.");
//     const logoutUri = `${window.location.origin}/`;
//     const cognitoDomain =
//       "https://us-east-1m9ctz8zr3.auth.us-east-1.amazoncognito.com";
//     window.location.href = `${cognitoDomain}/logout?client_id=${cognitoConfig.client_id}&logout_uri=${encodeURIComponent(
//       logoutUri
//     )}`;
//   });
// });

// Check for the Authorization Code (after login redirect)
if (window.location.search.includes("code")) {
  userManager
    .signinCallback()
    .then(() => {
      console.log("Login callback handled.");
      return userManager.getUser();
    })
    .then((user) => {
      updateUI(user);
    })
    .catch((err) => {
      console.error("Error during login callback:", err);
    });
}

// Update the UI based on login state
function updateUI(user) {
  if (user) {
    signInButton.style.display = "none";
    signOutButton.style.display = "block";
    signOutButton.textContent = `Sign Out (${user.profile.email})`;
  } else {
    signInButton.style.display = "block";
    signOutButton.style.display = "none";
  }
}


// Assuming this code is in your styled-login.js or another JS file
document.addEventListener('DOMContentLoaded', () => {
    const tutorialButton = document.getElementById('TutorialButton');

    tutorialButton.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent the default anchor behavior
        // Add your functionality here, e.g., navigate to a tutorial page
        console.log('Tutorial button clicked!'); // Example action
    });
});




// Assuming this code is in your styled-login.js or another JS file
document.addEventListener('DOMContentLoaded', () => {
    const tutorialButton = document.getElementById('loginButton');

    tutorialButton.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent the default anchor behavior
        // Add your functionality here, e.g., navigate to a tutorial page
        console.log('login button clicked!'); // Example action
        // use oidc-client-ts to sign in
        userManager.signinRedirect().then(() => {
            console.log("Redirecting to Cognito for login...");
          });

    });
});


// Assuming this code is in your styled-login.js or another JS file
document.addEventListener('DOMContentLoaded', () => {
    const tutorialButton = document.getElementById('profileButton');

    tutorialButton.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent the default anchor behavior
        // Add your functionality here, e.g., navigate to a tutorial page
        console.log('profile button clicked!'); // Example action
    });
});


// Assuming this code is in your styled-login.js or another JS file
document.addEventListener('DOMContentLoaded', () => {
    const tutorialButton = document.getElementById('playAgainButton');

    tutorialButton.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent the default anchor behavior
        // Add your functionality here, e.g., navigate to a tutorial page
        console.log('play again button clicked!'); // Example action
    });
});


// Assuming this code is in your styled-login.js or another JS file
document.addEventListener('DOMContentLoaded', () => {
    const tutorialButton = document.getElementById('chatButton');

    tutorialButton.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent the default anchor behavior
        // Add your functionality here, e.g., navigate to a tutorial page
        console.log('chat button clicked!'); // Example action
    });
});
