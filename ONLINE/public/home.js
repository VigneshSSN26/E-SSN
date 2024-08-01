document.addEventListener('DOMContentLoaded', function() {
    const userId = document.getElementById('user-id').value;
    console.log(userId); // Replace with actual user ID from your template
    const notificationButton = document.getElementById('notification-button');
    const notificationBadge = document.getElementById('notification-badge');

    // Fetch unread notifications count
    fetch(`/api/notifications/count/${userId}`)
        .then(response => response.json())
        .then(data => {
            const unreadCount = data.unreadCount;
            if (unreadCount > 0) {
                notificationBadge.textContent = unreadCount;
                notificationButton.classList.add('active');
            } else {
                notificationButton.classList.remove('active');
            }
        })
        .catch(error => {
            console.error('Error fetching notifications count:', error);
        });
});