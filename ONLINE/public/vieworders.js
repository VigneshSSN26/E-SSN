document.addEventListener('DOMContentLoaded', () => {
    const ordersTableBody = document.querySelector('#orders-table tbody');
    const shopId = document.getElementById('shop-id').value; 

    async function fetchOrders() {
        try {
            const response = await fetch(`/api/orders/${shopId}`);
            const result = await response.json();
            if (response.ok) {
                populateOrdersTable(result.orders);
            } else {
                console.error('Error fetching orders:', result.message);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    function populateOrdersTable(orders) {
        ordersTableBody.innerHTML = '';
    orders.forEach(order => {
    const itemNames = order.orders.map(orderItem => orderItem.dishName).filter(name => name).join(', ');
    const itemQuantities = order.orders.map(orderItem => orderItem.quantity || '').filter(quantity => quantity).join(', ');

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${order._id}</td>
        <td>${order.phoneNumber}</td>
        <td>${order.name}</td>
        <td>${itemNames}</td>
        <td>${itemQuantities}</td>
        <td>${order.totalcost}</td>
        <td>${order.status}</td>
        <td>
            <select class="select-status" onchange="updateOrderStatus('${order._id}', this.value)">
                <option value="progress" ${order.status === 'progress' ? 'selected' : ''}>In Progress</option>
                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
            </select>
        </td>
    `;
    ordersTableBody.appendChild(row);
});
    }

    window.updateOrderStatus = async (orderId, newStatus) => {
        try {
            const response = await fetch(`/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            const result = await response.json();
            if (response.ok) {
                alert(result.message);
                fetchOrders(); // Refresh the orders list
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while updating the order status.');
        }
    };

    fetchOrders();
});



