document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting the default way
    const name = document.getElementById('name').value;
    const phoneNumber = document.getElementById('phoneNumber').value;

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phoneNumber })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (data.redirectTo) {
                window.location.href = data.redirectTo; // Redirect to admin page
            } else {
                window.location.href = `/home/${data.userId}`; // Redirect to home page with user ID
            }
        } else {
            alert(data.message); // Show error message
        }
    })
    .catch(error => console.error('Error:', error));
});

