document.addEventListener('DOMContentLoaded', async function () {
    const userId = document.getElementById('user-id').value; // Get the user ID
    const notificationList = document.querySelector('.notification-list');

    try {
        // Fetch notifications for the user
        const response = await fetch(`/api/notifications?userId=${userId}`);
        if (response.ok) {
            const notifications = await response.json();

            // Display notifications
            notificationList.innerHTML = notifications.map(notification => `
                <div class="notification ${notification.viewed ? '' : 'unread'}" data-id="${notification._id}">
                    <p>${notification.message}</p>
                    <p class="timestamp">${new Date(notification.timestamp).toLocaleString()}</p>
                </div>
            `).join('');

            // Collect notification IDs that are not viewed
            const notificationIds = notifications
                .filter(notification => !notification.viewed)
                .map(notification => notification._id);

            console.log('Notification IDs:', notificationIds);

            // Mark notifications as viewed if there are any
            if (notificationIds.length > 0) {
                const updateResponse = await fetch('/api/notifications/viewed', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ notificationIds })
                });

                if (!updateResponse.ok) {
                    console.error('Error marking notifications as viewed:', updateResponse.statusText);
                } else {
                    console.log('Notifications marked as viewed successfully.');
                }
            }
        } else {
            console.error('Error fetching notifications:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching notifications:', error);
    }
});


