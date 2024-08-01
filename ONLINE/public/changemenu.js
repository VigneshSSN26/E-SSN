document.addEventListener('DOMContentLoaded', () => {
    const changeCostForm = document.getElementById('change-cost-form');

    changeCostForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default form submission

        const formData = new FormData(changeCostForm);
        const data = {
            name: formData.get('menu-name'),
            newCost: formData.get('new-cost')
        };

        try {
            const response = await fetch(`/api/change-cost/${formData.get('admin_id')}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message); // Show success message
                changeCostForm.reset(); // Reset form fields
            } else {
                alert(`Error: ${result.message}`); // Show error message
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while updating the cost.'); // Show error message on catch
        }
    });
});


