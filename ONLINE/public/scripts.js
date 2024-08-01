document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const otpForm = document.getElementById('otpForm');
    const otpSection = document.getElementById('otpSection');
    const timerElement = document.getElementById('timer');

    let timerInterval;
    let otpExpiryTime;
    const phoneNumber = document.getElementById('signup-number').value.trim();
    const name = document.getElementById('signup-name').value.trim();

    signupForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const phoneNumber = document.getElementById('signup-number').value.trim();
        const name = document.getElementById('signup-name').value.trim();

        // Debug logs
        console.log('Phone Number:', phoneNumber);
        console.log('Name:', name);

        if (!phoneNumber || phoneNumber.length !== 10 || isNaN(phoneNumber)) {
            alert('Please enter a valid 10-digit phone number.');
            return;
        }

        if (!name) {
            alert('Please enter your name.');
            return;
        }

        fetch('/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, name })
        })
        .then(response => {
            if (response.status === 400) {
                return response.text();
            } else {
                return response.text();
            }
        })
        .then(data => {
            if (data === 'User already exists') {
                alert('User already exists');
                otpSection.style.display = 'none'; // Hide OTP section
            } else {
                alert(data);
                otpSection.style.display = 'block'; // Show OTP section
                startTimer();
            }
        })
        .catch(error => console.error('Error:', error));
    });

    otpForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const phoneNumber = document.getElementById('signup-number').value.trim();
        const otp = document.getElementById('otp').value.trim();
        const name =  document.getElementById('signup-name').value.trim();

        if (!otp || otp.length !== 6 || isNaN(otp)) {
            alert('Please enter a valid OTP.');
            return;
        }

        fetch('/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber,name, otp })
        })
        .then(response => response.text())
        .then(data => {
            alert(data);
            if (data === 'OTP verified successfully') {
                window.location.href = '/login'; // Redirect to login page
            }
        })
        .catch(error => console.error('Error:', error));
    });

    function startTimer() {
        const expiryTime = Date.now() + 60000; // 1 minute from now
        otpExpiryTime = expiryTime;
        timerInterval = setInterval(() => {
            const remainingTime = Math.max(0, otpExpiryTime - Date.now());
            const minutes = Math.floor(remainingTime / 60000);
            const seconds = Math.floor((remainingTime % 60000) / 1000);
            timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                timerElement.textContent = '00:00';
                alert('OTP expired');
                otpSection.style.display = 'none'; // Hide OTP form
            }
        }, 1000);
    }
});



