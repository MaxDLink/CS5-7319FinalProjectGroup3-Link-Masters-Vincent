import {html, css, LitElement} from 'lit';
import './tutorial.js'; // import the tutorial element for the tutorial button 
import './profile-lit.js'; // import the profile element for the profile button 
import './ChatBox.js'; // import the chat box element for the chat button 

export class NavBar extends LitElement {
  static styles = css`
  
@import url('https://fonts.googleapis.com/css?family=Poppins:100,200, 300, 400, 500, 600, 700, 800, 900'); 

:host {
    position: relative; 
    left: 5px; 
    --clr: #222327; 

} 
* 
{ 
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Poppins', sans-serif;
}
:root {

}
body {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 120vh;
    background: transparent;
}
.navigation {
    width: 300px;
    height: 70px;
    background: white;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 10px;
} 
.navigation ul {
    display: flex; 
    width: 350px; 
} 
.navigation ul li {
    position: relative; 
    list-style: none; 
    width: 70px; 
    height: 70px; 
    z-index: 1; 
}
.navigation ul li a {
    position: relative; 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    flex-direction: column; 
    width: 100%; 
    text-align: center; 
    font-weight: 500; 
}
.navigation ul li a .icon {
    position: relative; 
    display: block; 
    line-height: 75px; 
    font-size: 1.5em; 
    text-align: center; 
    transition: 0.5s; 
    color: var(--clr); 
}
.navigation ul li.active a .icon {
    transform: translateY(-32px); 
}

.navigation ul li a .text {
    position: absolute;
    color: var(--clr); 
    font-weight: 500; 
    font-size: 0.75em;
    letter-spacing: 0.05em;
    transition: 0.5s;  
    opacity: 0;
    transform: translateY(20px); 
} 
.navigation ul li.active a .text
{
  opacity: 1;
  transform: translateY(10px); 
}
.indicator
{
  position: absolute; 
  top: -50%; 
  right: 230px; 
  width: 70px; 
  height: 70px; 
  background: #29fd53; 
  border-radius: 50%; 
  border: 6px solid var(--clr); 
  transition: 0.5s; 
} 
.indicator::before
{
  content: ''; 
  position: absolute; 
  top: 50%; 
  left: -22px; 
  width: 20px; 
  height: 20px; 
  background: transparent; 
  border-top-right-radius: 20px; 

} 
.indicator::after
{
  content: ''; 
  position: absolute; 
  top: 50%; 
  right: -22px; 
  width: 20px; 
  height: 20px; 
  background: transparent; 
  border-top-left-radius: 20px; 

}

.navigation ul li:nth-child(1).active ~ .indicator
{
  transform: translateX(calc(70px * 0)); 
}
.navigation ul li:nth-child(2).active ~ .indicator
{
  transform: translateX(calc(70px * 1)); 
}
.navigation ul li:nth-child(3).active ~ .indicator
{
  transform: translateX(calc(70px * 2)); 
}
.navigation ul li:nth-child(4).active ~ .indicator
{
  transform: translateX(calc(70px * 3)); 
}
.navigation ul li:nth-child(5).active ~ .indicator
{
  transform: translateX(calc(70px * 4)); 
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
    <div id="style-bar">
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
      <div class="indicator"></div>
    </div>
  </div>
  
  <div id="app">

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

  updateActiveLink() {
    const list = this.shadowRoot.querySelectorAll('.list');
    const indicator = this.shadowRoot.querySelector('.indicator'); // Select the indicator
    list.forEach((item, index) => {
      item.addEventListener('click', () => {
        list.forEach((el) => el.classList.remove('active'));
        item.classList.add('active');
        console.log(`Active item: ${item.innerText}`); // Log active item

        // Move the indicator based on the index of the active item
        indicator.style.transform = `translateX(calc(70px * ${index}))`;
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
    this.playAgainClickCount = 0; // reset
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
