import {html, css, LitElement} from 'lit';
import './tutorial.js'; // import the tutorial element for the tutorial button 
import './profile-lit.js'; // import the profile element for the profile button 
import './ChatBox.js'; // import the chat box element for the chat button 

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

  static properties = {
    chatBoxVisible: { type: Boolean }
  };

  static chatBoxInstance = null;

  constructor() {
    super();
    this.tutorialClickCount = 0;
    this.profileClickCount = 0;
    this.playAgainClickCount = 0;
    this.chatClickCount = 0;
    this.chatBoxVisible = false;
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
      
      // Simply create and append the profile element directly
      // This approach was working in the old code without explicitly checking login
      const app = document.createElement('div');
      app.innerHTML = `<profile-element></profile-element>`;
      document.body.appendChild(app);
      
      // Keep profileClickCount at 1 so that clicking again still works
      this.profileClickCount = 1;
    }
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
    this.chatBoxVisible = !this.chatBoxVisible;

    if (this.chatBoxVisible) {
      // If we don't have a chat box instance yet, create one
      if (!NavBar.chatBoxInstance) {
        const chatContainer = document.createElement('div');
        chatContainer.style.position = 'relative';
        const chatBox = document.createElement('chat-box');
        chatContainer.appendChild(chatBox);
        NavBar.chatBoxInstance = chatContainer;
      }

      // Find the chat button in the nav bar
      const chatButton = this.shadowRoot.querySelector('#chatButton');
      const chatButtonRect = chatButton.getBoundingClientRect();
      
      // Position the container relative to the chat button
      NavBar.chatBoxInstance.style.position = 'fixed';
      NavBar.chatBoxInstance.style.top = `${chatButtonRect.bottom + window.scrollY}px`;
      NavBar.chatBoxInstance.style.left = `${chatButtonRect.left}px`;
      
      document.body.appendChild(NavBar.chatBoxInstance);
    } else {
      // Hide the chat box
      if (NavBar.chatBoxInstance && NavBar.chatBoxInstance.parentNode) {
        NavBar.chatBoxInstance.parentNode.removeChild(NavBar.chatBoxInstance);
      }
    }
  }
}

customElements.define('nav-bar', NavBar);
