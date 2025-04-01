import { LitElement, html, css } from 'lit';

class ChatBox extends LitElement {
  static styles = css`
    :host {
      display: block;
      max-width: 400px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 15px;
      font-family: 'Poppins', sans-serif;
      overflow: hidden;
      background: rgba(30, 30, 30, 0.8);
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 10px;
      z-index: 1000;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      color: #ffffff;
    }

    .messages {
      height: 250px;
      overflow-y: auto;
      padding: 15px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    }

    .messages::-webkit-scrollbar {
      width: 6px;
    }

    .messages::-webkit-scrollbar-track {
      background: transparent;
    }

    .messages::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }

    .message {
      background: rgba(255, 255, 255, 0.1);
      padding: 10px 15px;
      border-radius: 12px;
      max-width: 80%;
      align-self: flex-start;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      font-size: 0.9em;
      line-height: 1.4;
      transition: all 0.2s ease;
    }

    .message:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-1px);
    }

    .message.user {
      background: #3498db;
      color: white;
      align-self: flex-end;
    }

    .message.user:hover {
      background: #2980b9;
    }

    .input-box {
      display: flex;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px;
      background: rgba(20, 20, 20, 0.5);
    }

    input {
      flex: 1;
      padding: 10px 15px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.05);
      color: #ffffff;
      font-family: 'Poppins', sans-serif;
      font-size: 0.9em;
      outline: none;
      transition: all 0.2s ease;
    }

    input:focus {
      border-color: #3498db;
      background: rgba(255, 255, 255, 0.1);
    }

    input::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }

    button {
      background: #3498db;
      color: white;
      border: none;
      padding: 10px 20px;
      margin-left: 10px;
      cursor: pointer;
      border-radius: 20px;
      font-family: 'Poppins', sans-serif;
      font-size: 0.9em;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    button:hover {
      background: #2980b9;
      transform: translateY(-1px);
    }

    button:active {
      transform: translateY(0);
    }

    .message.game {
      background: rgba(46, 204, 113, 0.2);
      border: 1px solid rgba(46, 204, 113, 0.3);
      color: #2ecc71;
      font-weight: 500;
      text-align: center;
      align-self: center;
      max-width: 90%;
      padding: 12px 20px;
    }

    .message.game.lose {
      background: rgba(231, 76, 60, 0.2);
      border: 1px solid rgba(231, 76, 60, 0.3);
      color: #e74c3c;
    }

    .message.game.win {
      background: rgba(46, 204, 113, 0.2);
      border: 1px solid rgba(46, 204, 113, 0.3);
      color: #2ecc71;
    }
  `;

  static properties = {
    messages: { type: Array },
  };

  constructor() {
    super();
    this.messages = [];
    this.addGameMessage("👋 Welcome to Battleship! I'll be your opponent. Good luck!", 'game');
  }

  addGameMessage(message, type = 'game') {
    this.messages = [...this.messages, { 
      text: message, 
      user: false, 
      type: type 
    }];
    this._autoScroll();
  }

  sendMessage() {
    const input = this.shadowRoot.getElementById('chatInput');
    const message = input.value.trim();
    if (message) {
      this.messages = [...this.messages, { 
        text: message, 
        user: true,
        type: 'user'
      }];
      input.value = '';
      this._autoScroll();
    }
  }

  _autoScroll() {
    setTimeout(() => {
      const container = this.shadowRoot.querySelector('.messages');
      container.scrollTop = container.scrollHeight;
    }, 10);
  }

  render() {
    return html`
      <div class="messages">
        ${this.messages.map(
          (msg) => html`<div class="message ${msg.user ? 'user' : ''} ${msg.type}">${msg.text}</div>`
        )}
      </div>
      <div class="input-box">
        <input id="chatInput" type="text" placeholder="Type a message..." @keyup="${(e) => e.key === 'Enter' && this.sendMessage()}" />
        <button @click="${this.sendMessage}">Send</button>
      </div>
    `;
  }
}

customElements.define('chat-box', ChatBox);
