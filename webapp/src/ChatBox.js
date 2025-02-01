import { LitElement, html, css } from 'lit';

class ChatBox extends LitElement {
  static styles = css`
    :host {
      display: block;
      max-width: 400px;
      border: 1px solid #ccc;
      border-radius: 10px;
      font-family: Arial, sans-serif;
      overflow: hidden;
      background: #f9f9f9;
    }

    .messages {
      height: 250px;
      overflow-y: auto;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .message {
      background: white;
      padding: 8px;
      border-radius: 5px;
      max-width: 80%;
      align-self: flex-start;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .message.user {
      background: #007aff;
      color: white;
      align-self: flex-end;
    }

    .input-box {
      display: flex;
      border-top: 1px solid #ccc;
      padding: 5px;
    }

    input {
      flex: 1;
      padding: 8px;
      border: none;
      outline: none;
      border-radius: 5px;
    }

    button {
      background: #007aff;
      color: white;
      border: none;
      padding: 8px 12px;
      margin-left: 5px;
      cursor: pointer;
      border-radius: 5px;
    }

    button:hover {
      background: #005ecb;
    }
  `;

  static properties = {
    messages: { type: Array },
  };

  constructor() {
    super();
    this.messages = [];
  }

  sendMessage() {
    const input = this.shadowRoot.getElementById('chatInput');
    const message = input.value.trim();
    if (message) {
      this.messages = [...this.messages, { text: message, user: true }];
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
          (msg) => html`<div class="message ${msg.user ? 'user' : ''}">${msg.text}</div>`
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
