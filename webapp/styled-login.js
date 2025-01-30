import { UserManager, Log } from "oidc-client-ts";
import './profile-lit.js'; // for profile page on profile button click 
import './ChatBox.js'; // for chat page on chat button click 
import './tutorial.js'; // for tutorial page on tutorial button click 

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
        // window.location.href = "scrollPage.html"; // Replace with your actual file name
        // link to tutorial lit element 
        document.body.innerHTML = ''; // Clear existing content
        const tutorialElement = document.createElement('tutorial-element');
        document.body.appendChild(tutorialElement);

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
        // Append the profile lit component directly to the body
        const app = document.createElement('div');
        app.innerHTML = `<profile-element></profile-element>`;
        document.body.appendChild(app);  
    });
});


// Assuming this code is in your styled-login.js or another JS file
document.addEventListener('DOMContentLoaded', () => {
    const tutorialButton = document.getElementById('playAgainButton');

    tutorialButton.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent the default anchor behavior
        // Add your functionality here, e.g., navigate to a tutorial page
        console.log('play again button clicked!'); // Example action
        // reload the game board
        window.location.reload();
    });
});


// Assuming this code is in your styled-login.js or another JS file
document.addEventListener('DOMContentLoaded', () => {
    const tutorialButton = document.getElementById('chatButton');

    tutorialButton.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent the default anchor behavior
        // Add your functionality here, e.g., navigate to a tutorial page
        console.log('chat button clicked!'); // Example action


        // Append the chat lit component directly to the body
        const app = document.createElement('div');
        app.innerHTML = `<chat-box></chat-box>`;
        document.body.appendChild(app);  

    });
});

// Add the jQuery code here
// $(document).on('click', '#loginButton', function() {
//     // Simulate login action
//     // After successful login, change the button
//     $('#loginListItem').hide(); // Hide login button
//     $('#profileListItem').show(); // Show profile button
// });

// show profile button after login button is clicked
// TODO: replace the login button with the profile button in a cleaner way. This keeps a local storage to get around the page refreshing on login, but that is bad architecture. 
$(document).ready(function(){
  // Check if the button has already been replaced
  if (localStorage.getItem('buttonReplaced') !== 'true') {
    $("#loginButton").click(function(){
      setTimeout(() => {
        $(this).replaceWith($('#profileListItem').show());
      }, 3000); // Delay of 3 seconds so that amazon cognito can pop up. Hacky fix 
        // Set the flag in localStorage
        localStorage.setItem('buttonReplaced', 'true');
    });
  } else {
    // If already replaced, you can directly add the new button
    $("#loginButton").replaceWith($('#profileListItem').show());
  }
});
