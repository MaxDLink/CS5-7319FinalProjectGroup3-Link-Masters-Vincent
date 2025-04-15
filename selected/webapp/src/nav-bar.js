import {html, css, LitElement} from 'lit';
import './tutorial.js';
import './profile-lit.js';
import './ChatBox.js';
import { UserManager } from 'oidc-client-ts';

export class NavBar extends LitElement {

  static properties = {
    chatBoxVisible: { type: Boolean },
    userManager: { type: Object }
  };

  static chatBoxInstance = null;

  constructor() {
    super();
    this.tutorialClickCount = 0;
    this.profileClickCount = 0;
    this.playAgainClickCount = 0;
    this.chatClickCount = 0;
    this.chatBoxVisible = false;
    
    // Initialize UserManager with the same config used in profile-lit.js
    this.userManager = new UserManager({
      authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_VtsIc3ZeH",
      client_id: "9ihaiqmpt1f94sci2553h6cfn",
      redirect_uri: `${window.location.origin}/`,
      response_type: "code",
      scope: "email openid phone"
    });
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

  async handleProfileClick() {
    this.tutorialClickCount = 0;
    this.playAgainClickCount = 0;
    this.chatClickCount = 0;
    this.profileClickCount = 1;
    
    if (this.profileClickCount === 1) {
      console.log('Profile button clicked!');
      
      try {
        const user = await this.userManager.getUser();
        
        if (user && !user.expired) {
          const app = document.createElement('div');
          app.innerHTML = `<profile-element></profile-element>`;
          document.body.appendChild(app);
        }
        else {
          this.showLoginDialog();
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
        this.showLoginDialog();
      }
      
      this.profileClickCount = 1;
    }
  }
  
  showLoginDialog() {
    const existingDialog = document.getElementById('login-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }
    
    // Create a modal
    const loginDialog = document.createElement('div');
    loginDialog.id = 'login-dialog';
    loginDialog.style.position = 'fixed';
    loginDialog.style.top = '50%';
    loginDialog.style.left = '50%';
    loginDialog.style.transform = 'translate(-50%, -50%)';
    loginDialog.style.background = 'var(--bg-color, rgba(30, 30, 30, 0.9))';
    loginDialog.style.padding = '30px';
    loginDialog.style.borderRadius = '15px';
    loginDialog.style.zIndex = '1000';
    loginDialog.style.color = '#fff';
    loginDialog.style.maxWidth = '400px';
    loginDialog.style.textAlign = 'center';
    loginDialog.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
    loginDialog.style.backdropFilter = 'blur(10px)';
    
    loginDialog.innerHTML = `
      <h2 style="margin-bottom: 20px; font-family: 'Poppins', sans-serif;">Sign In Required</h2>
      <p style="margin-bottom: 25px; font-family: 'Poppins', sans-serif;">Please sign in to view your profile and stats.</p>
      <div style="display: flex; justify-content: space-between;">
        <button id="cancel-btn" style="
          background: rgba(220, 53, 69, 0.8);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-family: 'Poppins', sans-serif;
        ">Cancel</button>
        <button id="signin-btn" style="
          background: rgba(13, 110, 253, 0.8);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-family: 'Poppins', sans-serif;
        ">Sign In</button>
      </div>
    `;
    
    document.body.appendChild(loginDialog);
    document.getElementById('cancel-btn').addEventListener('click', () => {
      document.body.removeChild(loginDialog);
    });
    
    document.getElementById('signin-btn').addEventListener('click', async () => {
      try {
        await this.userManager.signinRedirect();
        document.body.removeChild(loginDialog);
      } catch (error) {
        console.error('Login redirect error:', error);
        const errorMsg = document.createElement('p');
        errorMsg.style.color = 'red';
        errorMsg.style.marginTop = '10px';
        errorMsg.textContent = 'Sign-in failed. Please try again.';
        loginDialog.appendChild(errorMsg);
      }
    });
  }

  handlePlayAgainClick() {  
    this.tutorialClickCount = 0;
    this.profileClickCount = 0;
    this.chatClickCount = 0;
    this.playAgainClickCount = 1; // enter after first click 
    if (this.playAgainClickCount === 1) {
      console.log('Play Again button clicked!');
      
      // Dispatch the event on the window object to ensure it's globally accessible
      window.dispatchEvent(new CustomEvent('game-reset', {
        bubbles: true,
        composed: true // allows the event to cross shadow DOM boundaries
      }));
      console.log('Reset event dispatched on window object');
      
      this.playAgainClickCount = 0; // reset for future clicks 
    } 
  }

  handleChatClick() { 
    this.tutorialClickCount = 0;
    this.profileClickCount = 0;
    this.playAgainClickCount = 0;
    this.chatBoxVisible = !this.chatBoxVisible;

    if (this.chatBoxVisible) {
      if (!NavBar.chatBoxInstance) {
        NavBar.chatBoxInstance = document.createElement('chat-box');
      }

      const chatButton = this.shadowRoot.querySelector('#chatButton');
      const chatButtonRect = chatButton.getBoundingClientRect();
      
      const chatBoxContainer = document.createElement('div');
      chatBoxContainer.style.position = 'fixed';
      chatBoxContainer.style.top = `${chatButtonRect.bottom + window.scrollY}px`;
      chatBoxContainer.style.right = `${window.innerWidth - chatButtonRect.right}px`;
      chatBoxContainer.style.zIndex = '1001';
      
      chatBoxContainer.appendChild(NavBar.chatBoxInstance);
      document.body.appendChild(chatBoxContainer);
      NavBar.chatBoxInstance.container = chatBoxContainer;
    }
    else {
      if (NavBar.chatBoxInstance && NavBar.chatBoxInstance.container) {
        document.body.removeChild(NavBar.chatBoxInstance.container);
      }
    }
  }

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

}

customElements.define('nav-bar', NavBar);
