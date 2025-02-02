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
} 
* 
{ 
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Poppins', sans-serif;
}
:root {
    --clr: #222327; 
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
    background: #11dd44;
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
.navigation ul li:hover a .icon {
    transform: translateY(-35px); 
}

.navigation ul li a .text {
    position: absolute; 
} `;

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
  }

  // js functions for clicking the buttons 
  handleTutorialClick() {
    console.log('Tutorial button clicked!');
    document.body.innerHTML = ''; // Clear existing content
    const tutorialElement = document.createElement('tutorial-element');
    document.body.appendChild(tutorialElement);
  }

  handleProfileClick() {
    console.log('Profile button clicked!');
    // Append the profile lit component directly to the body
    const app = document.createElement('div');
    app.innerHTML = `<profile-element></profile-element>`;
    document.body.appendChild(app);  

  }

  handlePlayAgainClick() {
    console.log('Play Again button clicked!');
    // reload the game board
    window.location.reload();
  }

  handleChatClick() {
    console.log('Chat button clicked!');
    // Append the chat lit component directly to the body
    const app = document.createElement('div');
    app.innerHTML = `<chat-box></chat-box>`;
    document.body.appendChild(app);  

  }

}
customElements.define('nav-bar', NavBar);
