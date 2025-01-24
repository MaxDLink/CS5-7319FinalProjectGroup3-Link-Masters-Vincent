import {LitElement, html} from 'lit';

export class NameTag extends LitElement {
  static properties = {
    name: {},
  };

  constructor() {
    super();
    this.name = 'Enter your name here';
  }
  // TODO: Rewrite this handleClick function 
  handleClick() {
    const inputElement = this.shadowRoot.querySelector('input');
    const name = inputElement.value;

    // Ensure the endpoint URL is correct
    fetch('https://dzyrk280c7.execute-api.us-east-1.amazonaws.com/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pk: 'user', sk: 'name', data: { name } }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => console.log('Success:', data))
      .catch(error => console.error('Error:', error));
  }

  loadLastSavedName() {
    fetch('https://dzyrk280c7.execute-api.us-east-1.amazonaws.com/load', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        this.name = data.name || 'No name found';
      })
      .catch(error => console.error('Error:', error));
  }

render() {
  return html`
    <p>Hello, ${this.name}</p>
    <input placeholder="Enter your name">
    <button @click=${this.handleClick}>Save Name</button>
    <button @click=${this.loadLastSavedName}>Load Last Saved Name</button>
  `;
}
}

customElements.define('name-tag', NameTag);
