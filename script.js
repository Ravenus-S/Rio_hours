document.getElementById('hoursForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const date = document.getElementById('date').value;
    const foodSales = parseFloat(document.getElementById('foodSales').value);

    const barbecueWorkers = {
        Mariana: parseFloat(document.getElementById('hoursMariana').value) || 0,
        Lucas: parseFloat(document.getElementById('hoursLucas').value) || 0,
        Filipe: parseFloat(document.getElementById('hoursFilipe').value) || 0,
        Antonio: parseFloat(document.getElementById('hoursAntonio').value) || 0,
        Fernando: parseFloat(document.getElementById('hoursFernando').value) || 0,
        Marco: parseFloat(document.getElementById('hoursMarco').value) || 0,
        Dani: parseFloat(document.getElementById('hoursDani').value) || 0
    };

    const kitchenWorkers = {
        Sidney: parseFloat(document.getElementById('hoursSidney').value) || 0,
        Jamile: parseFloat(document.getElementById('hoursJamile').value) || 0,
        Ana: parseFloat(document.getElementById('hoursAna').value) || 0,
        Talita: parseFloat(document.getElementById('hoursTalita').value) || 0,
        Alfonso: parseFloat(document.getElementById('hoursAlfonso').value) || 0,
        LucasKitchen: parseFloat(document.getElementById('hoursLucasKitchen').value) || 0,
        MarcoKitchen: parseFloat(document.getElementById('hoursMarcoKitchen').value) || 0
    };

    fetch('/submit-hours', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date, foodSales, barbecue: barbecueWorkers, kitchen: kitchenWorkers })
    })
    .then(response => response.text())
    .then(data => {
        alert(data);
        const startOfWeek = getStartOfWeek(date);
        fetchWeeklyHours(startOfWeek);
    })
    .catch(error => {
        console.error('Error submitting hours:', error);
    });
});

window.onload = function() {
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = getStartOfWeek(today);
    fetchWeeklyHours(startOfWeek);
};

function getStartOfWeek(date) {
    return date;
}

function fetchWeeklyHours(startOfWeek) {
    fetch(`/weekly-hours?startOfWeek=${startOfWeek}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Received data:', data);
            console.log('Type of totalSales:', typeof data.totalSales);
            if (!Array.isArray(data.hours)) {
                throw new Error('Invalid data format for hours');
            }
            if (typeof data.totalSales !== 'number' || isNaN(data.totalSales)) {
                data.totalSales = 0;
                console.warn('Invalid totalSales received, defaulting to 0.');
            }
            updateSummary(data.hours, data.totalSales);
        })
        .catch(error => {
            console.error('Error fetching weekly hours:', error);
        });
}

function updateSummary(workersData, totalFoodSales) {
    const summaryElement = document.getElementById('summary');
    summaryElement.innerHTML = '';

    if (!Array.isArray(workersData) || workersData.length === 0) {
        summaryElement.innerHTML = '<p>No data available for the selected week.</p>';
        return;
    }

    const barbecueWorkers = workersData.filter(worker => worker.role === 'barbecue');
    const kitchenWorkers = workersData.filter(worker => worker.role === 'kitchen');

    const totalBarbecueHours = barbecueWorkers.reduce((acc, worker) => acc + worker.totalHours, 0);
    const totalKitchenHours = kitchenWorkers.reduce((acc, worker) => acc + worker.totalHours, 0);

    const barbecueRate = totalBarbecueHours > 0 ? (totalFoodSales * 0.045 / totalBarbecueHours) : 0;
    const kitchenRate = totalKitchenHours > 0 ? (totalFoodSales * 0.035 / totalKitchenHours) : 0;

    const barbecueSummary = document.createElement('div');
    barbecueSummary.innerHTML = `<h3 class="text-xl font-semibold text-gray-700">Barbecue Workers</h3>`;
    barbecueSummary.innerHTML += `<p>Hourly Rate: $${barbecueRate.toFixed(2)}/hour</p>`;
    barbecueWorkers.forEach(worker => {
        const earnings = (worker.totalHours * barbecueRate).toFixed(2);
        barbecueSummary.innerHTML += `<p>${worker.worker}: ${worker.totalHours} hours, $${earnings} earned</p>`;
    });
    summaryElement.appendChild(barbecueSummary);

    const kitchenSummary = document.createElement('div');
    kitchenSummary.innerHTML = `<h3 class="text-xl font-semibold text-gray-700">Kitchen Workers</h3>`;
    kitchenSummary.innerHTML += `<p>Hourly Rate: $${kitchenRate.toFixed(2)}/hour</p>`;
    kitchenWorkers.forEach(worker => {
        const earnings = (worker.totalHours * kitchenRate).toFixed(2);
        kitchenSummary.innerHTML += `<p>${worker.worker}: ${worker.totalHours} hours, $${earnings} earned</p>`;
    });
    summaryElement.appendChild(kitchenSummary);
}

function updateWeek() {
    const weekStart = document.getElementById('weekStart').value;
    fetchWeeklyHours(weekStart);
}
