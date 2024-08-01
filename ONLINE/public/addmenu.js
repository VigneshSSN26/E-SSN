document.addEventListener('DOMContentLoaded', () => {
    const addMenuForm = document.getElementById('add-menu-form');

    addMenuForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default form submission

        const formData = new FormData(addMenuForm);

        try {
            const response = await fetch(`/api/add-menu/${formData.get('admin_id')}`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message); // Show success message
                addMenuForm.reset(); // Reset form fields
            } else {
                alert(`Error: ${result.message}`); // Show error message
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while adding the menu item.'); // Show error message on catch
        }
    });
});


