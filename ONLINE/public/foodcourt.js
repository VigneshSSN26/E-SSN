document.addEventListener('DOMContentLoaded', function() {
    const now = new Date();
    const hours = now.getHours();

    if (hours >= 6 && hours < 11) {
        document.getElementById('breakfast-card').classList.add('active');
    } else if (hours >= 11 && hours < 16) {
        document.getElementById('lunch-card').classList.add('active');
    } else if (hours >= 16 && hours < 23) {
        document.getElementById('dinner-card').classList.add('active');
    }
});