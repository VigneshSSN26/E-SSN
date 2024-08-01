document.addEventListener('DOMContentLoaded', () => {
    const notificationTypeSelect = document.getElementById('notification-type');
    const allUsersNotification = document.getElementById('all-users-notification');
    const privateUserNotification = document.getElementById('private-user-notification');
    const sendNotificationForm = document.getElementById('send-notification-form');

    notificationTypeSelect.addEventListener('change', () => {
        if (notificationTypeSelect.value === 'all') {
            allUsersNotification.style.display = 'block';
            privateUserNotification.style.display = 'none';
        } else {
            allUsersNotification.style.display = 'none';
            privateUserNotification.style.display = 'block';
        }
    });

    sendNotificationForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const formData = new FormData(sendNotificationForm);
        const notificationType = formData.get('notification-type');
        const message = notificationType === 'all' ? formData.get('message-all') : formData.get('message-private');
        const name = formData.get('user-name');
        const phone = formData.get('user-phone');

        const payload = {
            type: notificationType,
            message,
            ...(notificationType === 'private' ? { name, phone } : {})
        };

        try {
            const response = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (response.ok) {
                alert('Notification sent successfully!');
                sendNotificationForm.reset();
            } else {
                alert('Error sending notification: ' + result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    });
});

