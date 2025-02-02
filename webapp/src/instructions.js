import { LitElement, html, css } from 'lit';

class Instructions extends LitElement {
    static styles = css`
    /* Add your styles here */


    .text-container {
        top: 50px; 
        left: -235px;
    } 


    .message {
        color: orange; /* Style the message text */
        margin: 0; /* Remove default margin */
        font-size: 1.2em; /* Adjust font size for better readability */
        font-weight: bold; 
        top: 75px; 
        left: 20px; 
    }


    .instruction-box {
    bottom: 600px; /* Adjust this value to position it higher or lower */
    left: 5px; /* Align with the login element */ 
    font-weight: bold;
    background-color: rgba(255, 255, 255, 0.8); /* Semi-transparent white background */
    border: 2px solid orange; /* Border color */
    border-radius: 8px; /* Rounded corners */
    padding: 10px; /* Padding inside the box */
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Subtle shadow for depth */
    width: 250px; /* Fixed width for the instruction box */
    height: 40px; /* Fixed height for the instruction box */
    text-align: center; /* Center the text */
    font-size: 0.75em; /* Adjust font size for better readability */
    }
    `;

    render() {
        return html`
            <div>
                <div class="instruction-box">
                    <div class="message">Place 4 ships on your board. <br> Tap on Player Board 4 times</div>
                </div>
            </div>
        `;
    }
}

customElements.define('instruction-component', Instructions);
