document.addEventListener('DOMContentLoaded', () => {
    const menuItems = document.querySelectorAll('.menu-item');
    const orderTableBody = document.querySelector('#order-table tbody');
    const totalAmountSpan = document.getElementById('total-amount');
    let totalAmount = 0;

    menuItems.forEach(item => {
        const plusButton = item.querySelector('.plus');
        const minusButton = item.querySelector('.minus');
        const quantitySpan = item.querySelector('.quantity');
        const dish = item.dataset.dish;
        const price = parseFloat(item.dataset.price);

        plusButton.addEventListener('click', () => {
            const currentQuantity = parseInt(quantitySpan.textContent);
            const newQuantity = currentQuantity + 1;
            quantitySpan.textContent = newQuantity;
            updateOrderTable(dish, price, newQuantity);
        });

        minusButton.addEventListener('click', () => {
            const currentQuantity = parseInt(quantitySpan.textContent);
            if (currentQuantity > 0) {
                const newQuantity = currentQuantity - 1;
                quantitySpan.textContent = newQuantity;
                updateOrderTable(dish, price, newQuantity);
            }
        });
    });

    function updateOrderTable(dish, price, quantity) {
        let row = orderTableBody.querySelector(`[data-dish="${dish}"]`);
        if (quantity === 0) {
            if (row) row.remove();
        } else {
            if (!row) {
                row = document.createElement('tr');
                row.dataset.dish = dish;
                row.innerHTML = `
                    <td>${dish}</td>
                    <td class="quantity">${quantity}</td>
                    <td class="price">${price * quantity}</td>
                `;
                orderTableBody.appendChild(row);
            } else {
                row.querySelector('.quantity').textContent = quantity;
                row.querySelector('.price').textContent = price * quantity;
            }
        }
        updateTotalAmount();
    }

    function updateTotalAmount() {
        totalAmount = Array.from(orderTableBody.querySelectorAll('.price'))
            .reduce((sum, priceCell) => sum + parseFloat(priceCell.textContent), 0);
        totalAmountSpan.textContent = totalAmount.toFixed(2);
    }

    document.getElementById('place-order').addEventListener('click', async () => {
        const orderData = Array.from(orderTableBody.querySelectorAll('tr')).map(row => ({
            dish: row.querySelector('td').textContent,
            quantity: parseInt(row.querySelector('.quantity').textContent),
            price: parseFloat(row.querySelector('.price').textContent) / parseInt(row.querySelector('.quantity').textContent)
        }));
        const container = document.querySelector('.container');
        const userId = container.dataset.userid; // Correctly access dataset attribute
        const type = 'breakfast'; // Adjust as needed // Assuming this is hardcoded for now. Adjust as needed.

        console.log('Order Data:', orderData); // Debugging
        console.log('User ID:', userId); // Debugging
        console.log('Order Type:', type); // Debugging

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ orders: orderData, userId: userId, type: type })
            });
            console.log('Response Status:', response.status); // Debugging
            if (response.ok) {
                alert('Order placed successfully!');
                orderTableBody.innerHTML = ''; // Clear the order summary
                totalAmountSpan.textContent = '0'; // Reset total amount
            } else {
                const errorData = await response.json();
                console.error('Error Data:', errorData); // Debugging
                alert('Error placing order.');
            }
        } catch (error) {
            console.error('Error:', error); // Debugging
            alert('Error placing order.');
        }
    });
});

