/*
 * Instruction component has been modified to not display any content
 */
import { LitElement, html, css } from 'lit';

class Instructions extends LitElement {
    static styles = css`
    .hidden {
        display: none;
    }
    `;

    render() {
        return html`
            <div class="hidden"></div>
        `;
    }
}

customElements.define('instruction-component', Instructions);
