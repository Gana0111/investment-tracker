// script.js
class InvestmentTracker {
    constructor() {
        this.investments = JSON.parse(localStorage.getItem('investments')) || [];
        this.holdings = [];
        this.analysis = {};
        this.userEmail = this.getUserEmail();
        this.trackUser();
        this.loadInvestments();
    }

    getUserEmail() {
        let email = localStorage.getItem('userEmail');
        if (!email) {
            email = prompt('Please enter your email for tracking purposes:') || 'anonymous';
            localStorage.setItem('userEmail', email);
        }
        return email;
    }

    trackUser() {
        const userData = {
            email: this.userEmail,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };
        
        // Store user data locally (in production, send to server)
        let users = JSON.parse(localStorage.getItem('trackedUsers')) || [];
        const existingUser = users.find(u => u.email === this.userEmail);
        
        if (existingUser) {
            existingUser.lastSeen = userData.timestamp;
        } else {
            userData.firstSeen = userData.timestamp;
            userData.lastSeen = userData.timestamp;
            users.push(userData);
        }
        
        localStorage.setItem('trackedUsers', JSON.stringify(users));
    }

    addInvestment() {
        const url = document.getElementById('fundUrl').value.trim();
        const amount = parseFloat(document.getElementById('investmentAmount').value);

        if (!url || !amount || amount <= 0) {
            alert('Please enter a valid URL and investment amount.');
            return;
        }

        if (!url.includes('groww.in/mutual-funds/')) {
            alert('Please enter a valid Groww mutual fund URL.');
            return;
        }

        const investment = { url, amount, id: Date.now() };
        this.investments.push(investment);
        this.saveInvestments();
        this.loadInvestments();
        
        document.getElementById('fundUrl').value = '';
        document.getElementById('investmentAmount').value = '';
    }

    removeInvestment(id) {
        this.investments = this.investments.filter(inv => inv.id !== id);
        this.saveInvestments();
        this.loadInvestments();
    }

    saveInvestments() {
        localStorage.setItem('investments', JSON.stringify(this.investments));
    }

    loadInvestments() {
        const tbody = document.querySelector('#investmentTable tbody');
        tbody.innerHTML = '';

        this.investments.forEach(investment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${investment.url}</td>
                <td>₹${investment.amount.toLocaleString()}</td>
                <td>
                    <button class="delete-btn" onclick="tracker.removeInvestment(${investment.id})">
                        Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async fetchHoldingsData(url) {
        try {
            // In a real implementation, you'd use a CORS proxy or backend service
            // For demo purposes, we'll simulate the data extraction
            
            // This would typically be: const response = await fetch(proxyUrl + encodeURIComponent(url));
            // For now, we'll simulate with sample data
            
            const fundName = this.extractFundNameFromUrl(url);
            const sampleHoldings = this.generateSampleHoldings(fundName);
            
            return sampleHoldings;
        } catch (error) {
            console.error('Error fetching holdings:', error);
            throw new Error(`Failed to fetch data from ${url}`);
        }
    }

    extractFundNameFromUrl(url) {
        const parts = url.split('/');
        const fundPart = parts[parts.length - 1] || parts[parts.length - 2];
        return fundPart.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    generateSampleHoldings(fundName) {
        // This simulates the data that would be scraped from Groww
        const companies = [
            'Reliance Industries', 'TCS', 'HDFC Bank', 'Infosys', 'ICICI Bank',
            'Bharti Airtel', 'ITC', 'SBI', 'Bajaj Finance', 'Kotak Mahindra Bank',
            'L&T', 'Asian Paints', 'Maruti Suzuki', 'Nestle India', 'HUL'
        ];
        
        const sectors = [
            'Technology', 'Banking & Financial Services', 'Oil & Gas', 'FMCG',
            'Telecommunications', 'Automobile', 'Construction', 'Pharmaceuticals'
        ];

        const holdings = [];
        const numHoldings = Math.floor(Math.random() * 15) + 10; // 10-25 holdings
        let totalPercentage = 0;

        for (let i = 0; i < numHoldings; i++) {
            const company = companies[Math.floor(Math.random() * companies.length)];
            const sector = sectors[Math.floor(Math.random() * sectors.length)];
            const percentage = Math.random() * 5 + 0.5; // 0.5% to 5.5%
            
            holdings.push({
                fundName,
                companyName: company + ' Ltd',
                sector,
                instrument: 'Equity',
                assetsPercentage: percentage.toFixed(2) + '%',
                lastUpdated: new Date()
            });
            
            totalPercentage += percentage;
        }

        // Normalize percentages to ensure they add up to a reasonable total
        const scaleFactor = Math.min(95, totalPercentage) / totalPercentage;
        holdings.forEach(holding => {
            const currentPct = parseFloat(holding.assetsPercentage);
            holding.assetsPercentage = (currentPct * scaleFactor).toFixed(2) + '%';
        });

        return holdings;
    }

    async runFullUpdate() {
        if (this.investments.length === 0) {
            alert('Please add some investments first.');
            return;
        }

        document.getElementById('loading').style.display = 'flex';
        this.holdings = [];

        try {
            for (const investment of this.investments) {
                const holdingsData = await this.fetchHoldingsData(investment.url);
                
                holdingsData.forEach(holding => {
                    const assetsPct = parseFloat(holding.assetsPercentage);
                    const investmentValue = Math.round((assetsPct / 100) * investment.amount);
                    
                    this.holdings.push({
                        ...holding,
                        investmentValue,
                        inputUrl: investment.url
                    });
                });

                // Add small delay to simulate real fetching
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            this.calculateAnalysis();
            this.displayHoldings();
            this.displayAnalysis();
            
            // Switch to output tab
            showTab('output');
            
            alert('Data updated successfully!');
        } catch (error) {
            console.error('Update failed:', error);
            alert('Failed to update data: ' + error.message);
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    calculateAnalysis() {
        const totalInvestment = this.investments.reduce((sum, inv) => sum + inv.amount, 0);
        const totalEquityInvested = this.holdings.reduce((sum, h) => sum + h.investmentValue, 0);
        const cashHolding = totalInvestment - totalEquityInvested;

        // Company-wise aggregation
        const companyMap = {};
        this.holdings.forEach(holding => {
            if (!companyMap[holding.companyName]) {
                companyMap[holding.companyName] = 0;
            }
            companyMap[holding.companyName] += holding.investmentValue;
        });

        // Sector-wise aggregation
        const sectorMap = {};
        this.holdings.forEach(holding => {
            if (!sectorMap[holding.sector]) {
                sectorMap[holding.sector] = 0;
            }
            sectorMap[holding.sector] += holding.investmentValue;
        });

        const topCompanies = Object.entries(companyMap)
            .map(([name, value]) => ({ name, value, percentage: (value / totalInvestment * 100).toFixed(2) }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 50);

        const sectors = Object.entries(sectorMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        this.analysis = {
            totalInvestment,
            totalEquityInvested,
            cashHolding,
            topCompanies,
            sectors
        };
    }

    displayHoldings() {
        // Update summary stats
        document.getElementById('totalInvestment').textContent = 
            '₹' + this.analysis.totalInvestment.toLocaleString();
        document.getElementById('totalEquity').textContent = 
            '₹' + this.analysis.totalEquityInvested.toLocaleString();
        document.getElementById('cashHolding').textContent = 
            '₹' + this.analysis.cashHolding.toLocaleString();

        // Populate holdings table
        const tbody = document.querySelector('#holdingsTable tbody');
        tbody.innerHTML = '';

        this.holdings.forEach(holding => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${holding.fundName}</td>
                <td>${holding.companyName}</td>
                <td>${holding.sector}</td>
                <td>${holding.instrument}</td>
                <td>${holding.assetsPercentage}</td>
                <td>₹${holding.investmentValue.toLocaleString()}</td>
                <td>${holding.lastUpdated.toLocaleDateString()}</td>
            `;
            tbody.appendChild(row);
        });
    }

    displayAnalysis() {
        // Display top companies table
        const companiesTableBody = document.querySelector('#companiesTable tbody');
        companiesTableBody.innerHTML = '';

        this.analysis.topCompanies.forEach(company => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${company.name}</td>
                <td>₹${company.value.toLocaleString()}</td>
                <td>${company.percentage}%</td>
            `;
            companiesTableBody.appendChild(row);
        });

        // Create charts
        this.createSectorChart();
        this.createCompaniesChart();
    }

    createSectorChart() {
        const ctx = document.getElementById('sectorChart').getContext('2d');
        
        if (window.sectorChartInstance) {
            window.sectorChartInstance.destroy();
        }

        window.sectorChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: this.analysis.sectors.map(s => s.name),
                datasets: [{
                    data: this.analysis.sectors.map(s => s.value),
                    backgroundColor: [
                        '#8e7cc3', '#6b5da8', '#9b8ce8', '#b8a9dc',
                        '#7c6fb1', '#a394d1', '#6f5f9c', '#8c7eb7',
                        '#9f90d4', '#b3a4e1', '#756498', '#8975ab'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createCompaniesChart() {
        const ctx = document.getElementById('companiesChart').getContext('2d');
        
        if (window.companiesChartInstance) {
            window.companiesChartInstance.destroy();
        }

        const top10Companies = this.analysis.topCompanies.slice(0, 10);

        window.companiesChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: top10Companies.map(c => c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name),
                datasets: [{
                    label: 'Investment Amount (₹)',
                    data: top10Companies.map(c => c.value),
                    backgroundColor: '#8e7cc3',
                    borderColor: '#6b5da8',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    exportToCSV() {
        if (this.holdings.length === 0) {
            alert('No data to export. Please run an update first.');
            return;
        }

        const headers = ['Fund Name', 'Company Name', 'Sector', 'Instrument', 'Assets %', 'Investment Value', 'Last Updated'];
        const csvContent = [
            headers.join(','),
            ...this.holdings.map(h => [
                h.fundName,
                h.companyName,
                h.sector,
                h.instrument,
                h.assetsPercentage,
                h.investmentValue,
                h.lastUpdated.toLocaleDateString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `investment_holdings_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    generatePDFReport() {
        if (typeof jsPDF === 'undefined') {
            alert('PDF generation library not loaded');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(20);
        doc.text('Investment Portfolio Report', 20, 30);
        
        // Summary
        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 50);
        doc.text(`Total Investment: ₹${this.analysis.totalInvestment.toLocaleString()}`, 20, 60);
        doc.text(`Equity Investment: ₹${this.analysis.totalEquityInvested.toLocaleString()}`, 20, 70);
        doc.text(`Cash Holdings: ₹${this.analysis.cashHolding.toLocaleString()}`, 20, 80);
        
        // Top companies table
        let yPos = 100;
        doc.text('Top 10 Companies by Investment:', 20, yPos);
        yPos += 10;
        
        this.analysis.topCompanies.slice(0, 10).forEach((company, index) => {
            doc.text(`${index + 1}. ${company.name}: ₹${company.value.toLocaleString()} (${company.percentage}%)`, 30, yPos);
            yPos += 8;
        });
        
        doc.save(`investment_report_${new Date().toISOString().split('T')[0]}.pdf`);
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            this.investments = [];
            this.holdings = [];
            this.analysis = {};
            this.saveInvestments();
            this.loadInvestments();
            
            // Clear tables
            document.querySelector('#holdingsTable tbody').innerHTML = '';
            document.querySelector('#companiesTable tbody').innerHTML = '';
            
            // Reset stats
            document.getElementById('totalInvestment').textContent = '₹0';
            document.getElementById('totalEquity').textContent = '₹0';
            document.getElementById('cashHolding').textContent = '₹0';
            
            // Clear charts
            if (window.sectorChartInstance) window.sectorChartInstance.destroy();
            if (window.companiesChartInstance) window.companiesChartInstance.destroy();
            
            alert('All data cleared successfully.');
        }
    }
}

// Tab functionality
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked tab button
    document.querySelector(`.tab-button[onclick="showTab('${tabName}')"]`).classList.add('active');
}

// Global functions
function addInvestment() {
    tracker.addInvestment();
}

function runFullUpdate() {
    tracker.runFullUpdate();
}

function clearAllData() {
    tracker.clearAllData();
}

function exportToCSV() {
    tracker.exportToCSV();
}

function generatePDFReport() {
    tracker.generatePDFReport();
}

// Initialize the app
const tracker = new InvestmentTracker();