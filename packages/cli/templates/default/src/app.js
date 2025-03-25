// Initialize the ACIP application
async function initApp() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        console.log('API Data:', data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// Start the application
initApp(); 