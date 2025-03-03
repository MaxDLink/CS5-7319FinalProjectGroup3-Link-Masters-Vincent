/*
 * I made several changes to the instructions component to better fit with the new layout:
 * 1. Redesigned the instruction box with a cleaner look and better readability
 * 2. Improved the message text styling with better color and line height
 * 3. Simplified the HTML structure by removing unnecessary nested divs
 * 4. Added responsive styling for mobile devices
 * 5. Removed absolute positioning that was causing layout issues
 */
import { LitElement, html, css } from 'lit';

class Instructions extends LitElement {
    static styles = css`
    .instruction-box {
        background-color: rgba(255, 255, 255, 0.9);
        border: 2px solid orange;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        width: 280px;
        text-align: center;
        margin-top: 10px;
    }

    .message {
        color: #ff8c00;
        margin: 0;
        font-size: 1em;
        font-weight: bold;
        line-height: 1.5;
    }

    @media (max-width: 768px) {
        .instruction-box {
            width: 90%;
            max-width: 280px;
        }
    }
    `;

    render() {
        return html`
            <div class="instruction-box">
                <div class="message">Place 4 ships on your board.<br>Tap on Player Board 4 times</div>
            </div>
        `;
    }
}

customElements.define('instruction-component', Instructions);
