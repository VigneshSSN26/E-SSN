document.addEventListener('DOMContentLoaded', function() {
    const menuItems = document.querySelectorAll('.menu-item');
    const orderTableBody = document.querySelector('#order-table tbody');
    const totalAmount = document.querySelector('#total-amount');
    let total = 0;

    menuItems.forEach(item => {
        const addButton = item.querySelector('.plus');
        const minusButton = item.querySelector('.minus');
        const quantity = item.querySelector('.quantity');

        addButton.addEventListener('click', function() {
            let currentQuantity = parseInt(quantity.textContent);
            currentQuantity++;
            quantity.textContent = currentQuantity;
            total += parseInt(item.getAttribute('data-price'));
            updateOrderSummary(item.getAttribute('data-item'), currentQuantity, total);
        });

        minusButton.addEventListener('click', function() {
            let currentQuantity = parseInt(quantity.textContent);
            if (currentQuantity > 0) {
                currentQuantity--;
                quantity.textContent = currentQuantity;
                total -= parseInt(item.getAttribute('data-price'));
                updateOrderSummary(item.getAttribute('data-item'), currentQuantity, total);
            }
        });
    });

    function updateOrderSummary(item, quantity, total) {
        const existingItemRow = orderTableBody.querySelector(`tr[data-item="${item}"]`);

        if (quantity === 0 && existingItemRow) {
            existingItemRow.remove();
        } else {
            if (existingItemRow) {
                existingItemRow.querySelector('.quantity-cell').textContent = quantity;
                existingItemRow.querySelector('.price-cell').textContent = `₹${quantity * parseInt(existingItemRow.getAttribute('data-price'))}`;
            } else {
                const newRow = document.createElement('tr');
                newRow.setAttribute('data-item', item);
                newRow.setAttribute('data-price', total / quantity);

                newRow.innerHTML = `
                    <td>${item}</td>
                    <td class="quantity-cell">${quantity}</td>
                    <td class="price-cell">₹${quantity * total / quantity}</td>
                `;
                orderTableBody.appendChild(newRow);
            }
        }

        totalAmount.textContent = total;
    }

    const placeOrderButton = document.querySelector('#place-order');
    placeOrderButton.addEventListener('click', function() {
        if (total > 0) {
            alert('Order placed successfully!');
            // You can add further processing here, like sending order details to a server.
        } else {
            alert('Please order what you want.');
        }
    });
});
