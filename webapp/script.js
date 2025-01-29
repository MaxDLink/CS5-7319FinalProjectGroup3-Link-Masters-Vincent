// Function to reveal text with a delay
const revealTextWithDelay = () => {
    const sections = document.querySelectorAll('section[data-delay]');
    sections.forEach(section => {
        const delay = section.getAttribute('data-delay');
        setTimeout(() => {
            section.classList.add('visible'); // Add a class to make the text visible
        }, delay);
    });
};

// Call the function to reveal text
revealTextWithDelay();

// ... existing code ...