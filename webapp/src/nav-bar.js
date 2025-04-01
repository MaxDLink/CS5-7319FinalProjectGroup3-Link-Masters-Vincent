import {html, css, LitElement} from 'lit';
import './tutorial.js'; // import the tutorial element for the tutorial button 
import './profile-lit.js'; // import the profile element for the profile button 
import './ChatBox.js'; // import the chat box element for the chat button 

// Remove the Ionicons import and use a simpler approach

export class NavBar extends LitElement {
  static styles = css`
  @import url('https://fonts.googleapis.com/css?family=Poppins:300,400,500,600');

  :host {
    --primary-color: #3498db;
    --secondary-color: #2ecc71;
    --text-color: #ffffff;
    --bg-color: rgba(30, 30, 30, 0.8);
    --hover-color: rgba(255, 255, 255, 0.1);
    display: block;
    width: 100%;
  }

  * { 
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Poppins', sans-serif;
  }

  /* Minimalist floating navbar at the top */
  .navigation-container {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    width: auto;
  }

  .navigation {
    display: flex;
    background-color: var(--bg-color);
    border-radius: 30px;
    padding: 8px 16px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .navigation ul {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 20px;
  }

  .navigation ul li {
    position: relative;
  }

  .navigation ul li a {
    display: flex;
    align-items: center;
    text-decoration: none;
    padding: 8px 12px;
    border-radius: 20px;
    transition: all 0.2s ease;
  }

  .navigation ul li a:hover {
    background-color: var(--hover-color);
  }

  .navigation ul li.active a {
    background-color: var(--primary-color);
  }

  .navigation ul li a .icon {
    color: var(--text-color);
    font-size: 1.2em;
    transition: transform 0.2s ease;
  }

  .navigation ul li a .text {
    color: var(--text-color);
    font-size: 0.85em;
    font-weight: 500;
    margin-left: 8px;
    opacity: 0;
    width: 0;
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .navigation ul li.active a .icon,
  .navigation ul li a:hover .icon {
    transform: scale(1.1);
  }

  .navigation ul li.active a .text,
  .navigation ul li a:hover .text {
    opacity: 1;
    width: auto;
    margin-left: 8px;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .navigation {
      padding: 6px 12px;
    }
    
    .navigation ul {
      gap: 10px;
    }
    
    .navigation ul li a {
      padding: 6px 10px;
    }
  }

  /* For very small screens */
  @media (max-width: 480px) {
    .navigation-container {
      top: 10px;
    }
    
    .navigation {
      padding: 4px 10px;
    }
    
    .navigation ul {
      gap: 5px;
    }
    
    .navigation ul li a {
      padding: 5px 8px;
    }
    
    .navigation ul li a .icon {
      font-size: 1.1em;
    }
  }
  `;

  constructor() {
    super();
    this.tutorialClickCount = 0;
    this.profileClickCount = 0;
    this.playAgainClickCount = 0;
    this.chatClickCount = 0;
  }

  render() {
    return html` 
    <div class="navigation-container">
      <div class="navigation">
        <ul>
          <li class="list">
            <a href="#" id="playAgainButton" @click=${this.handlePlayAgainClick}>
              <span class="icon">↻</span>
              <span class="text">Restart</span>
            </a>
          </li>
          
          <li class="list">
            <a href="#" id="TutorialButton" @click=${this.handleTutorialClick}>
              <span class="icon">?</span>
              <span class="text">Help</span>
            </a>
          </li>
          
          <li class="list">
            <a href="#" id="ProfileButton" @click=${this.handleProfileClick}>
              <span class="icon">👤</span>
              <span class="text">Profile</span>
            </a>
          </li>
          
          <li class="list">
            <a href="#" id="chatButton" @click=${this.handleChatClick}>
              <span class="icon">💬</span>
              <span class="text">Chat</span>
            </a>
          </li>
        </ul>
      </div>
    </div>
  `;
  }

  firstUpdated() {
    this.updateActiveLink();
  }

  updateActiveLink() {
    const list = this.shadowRoot.querySelectorAll('.list');
    list.forEach((item) => {
      item.addEventListener('click', () => {
        list.forEach((el) => el.classList.remove('active'));
        item.classList.add('active');
      });
    });
  }

  handleTutorialClick() {
    this.profileClickCount = 0;
    this.playAgainClickCount = 0;
    this.chatClickCount = 0;
    this.tutorialClickCount = 1; // enter after first click 
    if (this.tutorialClickCount === 1) {
      console.log('Tutorial button clicked!');
      document.body.innerHTML = '';
      const tutorialElement = document.createElement('tutorial-element');
      document.body.appendChild(tutorialElement);
      this.tutorialClickCount = 0; // reset for future clicks 
    } 
  }

  handleProfileClick() {
    this.tutorialClickCount = 0;
    this.playAgainClickCount = 0;
    this.chatClickCount = 0;
    this.profileClickCount = 1; // enter after first click 
    if (this.profileClickCount === 1) {
      console.log('Profile button clicked!');
      
      // Check if user is logged in, if not show login dialog
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      
      if (isLoggedIn) {
        // Show profile if logged in
        this.showUserProfile();
      } else {
        // Show login dialog if not logged in
        this.showLoginDialog();
      }
      
      this.profileClickCount = 0; // reset for future clicks 
    } 
  }

  showUserProfile() {
    // Remove any existing profile elements first
    const existingProfile = document.querySelector('profile-element');
    if (existingProfile) {
      existingProfile.remove();
    }
    
    // Create and append the profile element
    const profileElement = document.createElement('profile-element');
    document.body.appendChild(profileElement);
    
    // Force a refresh of the profile data
    setTimeout(() => {
      if (profileElement.loadUserProfile) {
        profileElement.loadUserProfile();
      }
    }, 100);
  }

  showLoginDialog() {
    const loginDialog = document.createElement('div');
    loginDialog.id = 'login-dialog';
    loginDialog.style.position = 'fixed';
    loginDialog.style.top = '50%';
    loginDialog.style.left = '50%';
    loginDialog.style.transform = 'translate(-50%, -50%)';
    loginDialog.style.zIndex = '1000';
    loginDialog.style.backgroundColor = 'var(--card-bg-color, #1e1e1e)';
    loginDialog.style.padding = '30px';
    loginDialog.style.borderRadius = '15px';
    loginDialog.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.5)';
    loginDialog.style.backdropFilter = 'blur(10px)';
    loginDialog.style.border = '1px solid var(--border-color, rgba(255, 255, 255, 0.1))';
    loginDialog.style.color = 'var(--text-color, #ffffff)';
    loginDialog.style.fontFamily = "'Poppins', sans-serif";
    loginDialog.style.minWidth = '200px';
    
    loginDialog.innerHTML = `
      <h3 style="color: var(--text-color, #ffffff); margin-bottom: 20px; text-align: center; font-size: 1.5em; font-weight: 500;">Please Sign In</h3>
      <div style="display: flex; justify-content: center;">
        <button id="sign-in-button" style="
          background-color: var(--bg-color, rgba(30, 30, 30, 0.8));
          color: var(--text-color, #ffffff);
          border: none;
          padding: 8px 20px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.85em;
          font-family: 'Poppins', sans-serif;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        ">Sign In</button>
      </div>
      <button id="close-login" style="
        background: none;
        border: none;
        color: var(--text-color, #ffffff);
        position: absolute;
        top: 10px;
        right: 10px;
        cursor: pointer;
        font-size: 1.2em;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s ease;
        ">✕</button>
    `;
    
    document.body.appendChild(loginDialog);
    
    // Add hover effects
    const signInButton = loginDialog.querySelector('#sign-in-button');
    signInButton.addEventListener('mouseover', () => {
      signInButton.style.backgroundColor = 'var(--hover-color, rgba(255, 255, 255, 0.1))';
      signInButton.style.transform = 'scale(1.05)';
    });
    signInButton.addEventListener('mouseout', () => {
      signInButton.style.backgroundColor = 'var(--bg-color, rgba(30, 30, 30, 0.8))';
      signInButton.style.transform = 'scale(1)';
    });
    
    // Add click handler for sign in
    signInButton.addEventListener('click', () => {
      const cognitoDomain = "https://us-east-1m9ctz8zr3.auth.us-east-1.amazoncognito.com";
      const clientId = "tj2n9mnpm20nn9d015ahkr7da";
      const redirectUri = encodeURIComponent(`${window.location.origin}/`);
      const loginUrl = `${cognitoDomain}/login?client_id=${clientId}&response_type=code&scope=email+openid+profile&redirect_uri=${redirectUri}`;
      
      // Redirect to Cognito login page
      window.location.href = loginUrl;
      document.body.removeChild(loginDialog);
    });

    // Close button hover effect
    const closeButton = loginDialog.querySelector('#close-login');
    closeButton.addEventListener('mouseover', () => {
      closeButton.style.backgroundColor = 'var(--hover-color, rgba(255, 255, 255, 0.1))';
    });
    closeButton.addEventListener('mouseout', () => {
      closeButton.style.backgroundColor = 'transparent';
    });
    
    // Close button click handler
    closeButton.addEventListener('click', () => {
      document.body.removeChild(loginDialog);
    });
  }

  handlePlayAgainClick() {  
    this.tutorialClickCount = 0;
    this.profileClickCount = 0;
    this.chatClickCount = 0;
    this.playAgainClickCount = 1; // enter after first click 
    if (this.playAgainClickCount === 1) {
      console.log('Play Again button clicked!');
      
      // Dispatch a custom event that the game-board can listen for
      const resetEvent = new CustomEvent('game-reset', {
        bubbles: true,
        composed: true // This allows the event to cross shadow DOM boundaries
      });
      this.dispatchEvent(resetEvent);
      console.log('Reset event dispatched');
      
      this.playAgainClickCount = 0; // reset for future clicks 
    } 
  }

  handleChatClick() { 
    this.tutorialClickCount = 0;
    this.profileClickCount = 0;
    this.playAgainClickCount = 0;
    this.chatClickCount = 1; // enter after first click 
    if (this.chatClickCount === 1) {
      console.log('Chat button clicked!');
      const app = document.createElement('div');
      app.innerHTML = `<chat-box></chat-box>`;
      document.body.appendChild(app);  
      this.chatClickCount = 0; // reset for future clicks 
    } 
  }
}

customElements.define('nav-bar', NavBar);
