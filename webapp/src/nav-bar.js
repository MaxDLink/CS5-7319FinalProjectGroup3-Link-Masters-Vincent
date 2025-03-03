import {html, css, LitElement} from 'lit';
import './tutorial.js'; // import the tutorial element for the tutorial button 
import './profile-lit.js'; // import the profile element for the profile button 
import './ChatBox.js'; // import the chat box element for the chat button 

export class NavBar extends LitElement {
  static styles = css`
  
@import url('https://fonts.googleapis.com/css?family=Poppins:100,200, 300, 400, 500, 600, 700, 800, 900'); 

/* I moved the navigation bar to the top by changing the host positioning and adding CSS variables for easier theming */
:host {
    --primary-color: #29fd53;
    --text-color: #222327;
    --bg-color: #ffffff;
    --shadow-color: rgba(0, 0, 0, 0.1);
    width: 100%;
} 

* { 
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Poppins', sans-serif;
}

/* I created a container for the navigation that's fixed at the top of the viewport */
.navigation-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 1000;
    padding: 10px 0;
    background-color: var(--bg-color);
    box-shadow: 0 2px 10px var(--shadow-color);
}

/* I centered the navigation and made it responsive with a max-width */
.navigation {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 8px;
    padding: 5px;
} 

/* I adjusted the list to be evenly spaced across the navigation bar */
.navigation ul {
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 0 20px;
} 

/* I made each navigation item take up equal space using flex */
.navigation ul li {
    position: relative; 
    list-style: none; 
    z-index: 1; 
    flex: 1;
    text-align: center;
}

/* I improved the styling of navigation links with better padding and transitions */
.navigation ul li a {
    position: relative; 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    flex-direction: column; 
    width: 100%; 
    text-align: center; 
    font-weight: 500;
    padding: 10px 0;
    text-decoration: none;
    transition: 0.3s;
}

/* I adjusted the icon styling for a cleaner look */
.navigation ul li a .icon {
    position: relative; 
    display: block;
    font-size: 1.5em; 
    text-align: center; 
    transition: 0.3s; 
    color: var(--text-color); 
}

/* I made the text always visible but with reduced opacity when not active */
.navigation ul li a .text {
    color: var(--text-color); 
    font-weight: 500; 
    font-size: 0.75em;
    letter-spacing: 0.05em;
    transition: 0.3s;
    margin-top: 5px;
    opacity: 0.7;
}

/* I changed the active state to use color and a subtle transform instead of large movements */
.navigation ul li.active a .icon {
    color: var(--primary-color);
    transform: translateY(-2px);
}

.navigation ul li.active a .text {
    opacity: 1;
    color: var(--primary-color);
}

/* I added hover effects for better user interaction */
.navigation ul li a:hover .icon {
    transform: translateY(-2px);
}

.navigation ul li a:hover .text {
    opacity: 1;
}

/* I replaced the circular indicator with a modern underline indicator for active items */
.navigation ul li.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 30px;
    height: 3px;
    background-color: var(--primary-color);
    border-radius: 3px;
}

/* I added responsive adjustments for mobile devices */
@media (max-width: 768px) {
    .navigation {
        max-width: 100%;
    }
    
    .navigation ul {
        padding: 0 10px;
    }
    
    .navigation ul li a .text {
        font-size: 0.7em;
    }
}
`;

  constructor() {
    super();
    this.tutorialClickCount = 0; // Initialize click count
    this.profileClickCount = 0; // Initialize click count
    this.playAgainClickCount = 0; // Initialize click count
    this.chatClickCount = 0; // Initialize click count
  }

  render() {
    return html` 
    <!-- I simplified the HTML structure and removed unnecessary divs -->
    <div class="navigation-container">
      <div class="navigation">
        <ul>
          <li class="list active">
            <a href="#" id="TutorialButton" @click=${this.handleTutorialClick}>
              <span class="icon"><ion-icon name="help-outline"></ion-icon></span>
              <span class="text">Tutorial</span>
            </a>
          </li>
          
          <li class="list">
            <a href="#" id="ProfileButton" @click=${this.handleProfileClick}>
              <span class="icon"><ion-icon name="person-circle-outline"></ion-icon></span>
              <span class="text">Profile</span>
            </a>
          </li>

          <li class="list">
            <a href="#" id="playAgainButton" @click=${this.handlePlayAgainClick}>
              <span class="icon"><ion-icon name="play-outline"></ion-icon></span>
              <span class="text">Play Again</span>
            </a>
          </li>
          
          <li class="list">
            <a href="#" id="chatButton" @click=${this.handleChatClick}>
              <span class="icon"><ion-icon name="chatbox-outline"></ion-icon></span>
              <span class="text">Chat</span>
            </a>
          </li>
        </ul>
      </div>
    </div>
  `;
  }

  firstUpdated() { // loads ionicons 
    // Load ionicons
    const scriptModule = document.createElement('script');
    scriptModule.type = 'module';
    scriptModule.src = 'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js';
    document.head.appendChild(scriptModule);

    const scriptNomodule = document.createElement('script');
    scriptNomodule.nomodule = true;
    scriptNomodule.src = 'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js';
    document.head.appendChild(scriptNomodule);

    this.updateActiveLink(); // Call to set the active link on first update
  }

  /* I simplified the updateActiveLink method by removing the indicator positioning logic */
  updateActiveLink() {
    const list = this.shadowRoot.querySelectorAll('.list');
    list.forEach((item) => {
      item.addEventListener('click', () => {
        list.forEach((el) => el.classList.remove('active'));
        item.classList.add('active');
        console.log(`Active item: ${item.querySelector('.text').textContent}`); // Log active item
      });
    });
  }

  // js functions for clicking the buttons 
  handleTutorialClick() {
    this.profileClickCount = 0; // reset
    this.playAgainClickCount = 0; // reset
    this.chatClickCount = 0; // reset
    if (this.tutorialClickCount === 1) {
      console.log('Tutorial button clicked!');
      document.body.innerHTML = ''; // Clear existing content
      const tutorialElement = document.createElement('tutorial-element');
      document.body.appendChild(tutorialElement);
      this.tutorialClickCount = 0; // Reset count after action
    } else {
      this.tutorialClickCount = 1; // Set count to 1 on first click
    }
  }

  handleProfileClick() {
    this.tutorialClickCount = 0; // reset
    this.profileClickCount = 0; // reset
    this.chatClickCount = 0; // reset
    if (this.profileClickCount === 1) {
      console.log('Profile button clicked!');
      // Append the profile lit component directly to the body
      const app = document.createElement('div');
      app.innerHTML = `<profile-element></profile-element>`;
      document.body.appendChild(app);  
      this.profileClickCount = 0; // Reset count after action
    } else {
      this.profileClickCount = 1; // Set count to 1 on first click
    }
  }

  handlePlayAgainClick() {  
    this.tutorialClickCount = 0; // reset
    this.profileClickCount = 0; // reset
    this.chatClickCount = 0; // reset
    if (this.playAgainClickCount === 1) {
      console.log('Play Again button clicked!');
      // reload the game board
      window.location.reload();
      this.playAgainClickCount = 0; // Reset count after action
    } else {
      this.playAgainClickCount = 1; // Set count to 1 on first click
    }
  }

  handleChatClick() { 
    this.tutorialClickCount = 0; // reset
    this.profileClickCount = 0; // reset
    this.playAgainClickCount = 0; // reset
    if (this.chatClickCount === 1) {
      console.log('Chat button clicked!');
      // Append the chat lit component directly to the body
      const app = document.createElement('div');
      app.innerHTML = `<chat-box></chat-box>`;
      document.body.appendChild(app);  
      this.chatClickCount = 0; // Reset count after action
    } else {
      this.chatClickCount = 1; // Set count to 1 on first click
    }
  }
}

customElements.define('nav-bar', NavBar);
