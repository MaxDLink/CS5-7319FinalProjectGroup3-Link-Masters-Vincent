// Object to keep track of click counts for each button
// creteria is 2 
// starts at 1 and not 0 because the user starts on the tutorial button and we want that to be activated immediately if they click it 
const clickCounts = {}; 

clickCounts['TutorialButton'] = 1;

// Function to handle login click
function handleTutorialClick(event) {
    event.preventDefault(); // Prevent default anchor behavior
    const buttonId = 'TutorialButton'; // ID of the login button

    // Increment the click count for the login button by 1
    clickCounts[buttonId] = (clickCounts[buttonId] || 0) + 1;

    // Check if it's the second click
    if (clickCounts[buttonId] === 2) {
        console.log('Tutorial button activated!'); // Confirm the click is registered
        const loginElement = document.querySelector('login-element'); // Get the Lit component
        if (loginElement) {
            loginElement.login(); // Call the login method
        }
        // Reset the click count
        clickCounts[buttonId] = 0;
    } else {
        // Move the selector (you can implement your selector logic here)
        console.log('Selector moved for Tutorial button.'); // Placeholder for selector logic
    }
}

// Function to handle login click
function handleLoginClick(event) {
    event.preventDefault(); // Prevent default anchor behavior
    const buttonId = 'loginButton'; // ID of the login button

    // Increment the click count for the login button
    clickCounts[buttonId] = (clickCounts[buttonId] || 0) + 1;

    // Check if it's the second click
    if (clickCounts[buttonId] === 2) {
        console.log('Login button activated!'); // Confirm the click is registered
        const loginElement = document.querySelector('login-element'); // Get the Lit component
        if (loginElement) {
            loginElement.login(); // Call the login method
        }
        // Reset the click count
        clickCounts[buttonId] = 0;
        clickCounts['TutorialButton'] = 0;
    } else {
        // Move the selector (you can implement your selector logic here)
        console.log('Selector moved for Login button.'); // Placeholder for selector logic
    }
}

// Function to handle link clicks and make buttons active
function handleProfileClick(event) {
    event.preventDefault(); // Prevent default anchor behavior
    const buttonId = 'ProfileButton'; // ID of the login button

    // Increment the click count for the login button
    clickCounts[buttonId] = (clickCounts[buttonId] || 0) + 1;

    // Check if it's the second click
    if (clickCounts[buttonId] === 2) {
        console.log('Profile button clicked'); // Confirm the click is registered
        const loginElement = document.querySelector('login-element'); // Get the Lit component
        if (loginElement) {
            loginElement.login(); // Call the login method
        }
        // Reset the click count
        clickCounts[buttonId] = 0;
    } else {
        // Move the selector (you can implement your selector logic here)
        console.log('Selector moved for Profile button.'); // Placeholder for selector logic
    } 
}

// Function to handle login click
function handlePlayAgainClick(event) {
    event.preventDefault(); // Prevent default anchor behavior
    const buttonId = 'PlayAgainButton'; // ID of the login button

    // Increment the click count for the login button by 1 
    clickCounts[buttonId] = (clickCounts[buttonId] || 0) + 1;

    // Check if it's the second click
    if (clickCounts[buttonId] === 2) {
        console.log('Play Again button activated!'); // Confirm the click is registered
        const loginElement = document.querySelector('login-element'); // Get the Lit component
        if (loginElement) {
            loginElement.login(); // Call the login method
        }
        // Reset the click count
        clickCounts[buttonId] = 0;
        clickCounts['TutorialButton'] = 0;
    } else {
        // Move the selector (you can implement your selector logic here)
        console.log('Selector moved for PlayAgain button.'); // Placeholder for selector logic
    }
}

// Function to handle login click
function handleChatClick(event) {
    event.preventDefault(); // Prevent default anchor behavior
    const buttonId = 'ChatButton'; // ID of the login button

    // Increment the click count for the login button by 1 
    clickCounts[buttonId] = (clickCounts[buttonId] || 0) + 1;

    // Check if it's the second click
    if (clickCounts[buttonId] === 2) {
        console.log('Chat button activated!'); // Confirm the click is registered
        const loginElement = document.querySelector('login-element'); // Get the Lit component
        if (loginElement) {
            loginElement.login(); // Call the login method
        }
        // Reset the click count
        clickCounts[buttonId] = 0;
        clickCounts['TutorialButton'] = 0;
    } else {
        // Move the selector (you can implement your selector logic here)
        console.log('Selector moved for Chat button.'); // Placeholder for selector logic
    }
}