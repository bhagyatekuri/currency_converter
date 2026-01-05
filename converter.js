/**
 * Currency Converter Application
 * Production-ready client-side JavaScript
 * 
 * API Used: ExchangeRate-API (https://www.exchangerate-api.com/)
 * Free tier: 1,500 requests/month, no credit card required
 * 
 * Setup Instructions:
 * 1. Visit https://www.exchangerate-api.com/
 * 2. Sign up for a free account
 * 3. Copy your API key from the dashboard
 * 4. Replace 'YOUR_API_KEY_HERE' below with your actual API key
 * 
 * @version 1.0.0
 * @author Currency Converter Team
 */

'use strict';

/* ========================================
   Configuration
   ======================================== */

var CONFIG = {
    API_KEY: '5ff4ca04351879ddbe7f83ea', // Your ExchangeRate-API key
    API_BASE_URL: 'https://v6.exchangerate-api.com/v6',
    DEFAULT_FROM_CURRENCY: 'USD',
    DEFAULT_TO_CURRENCY: 'EUR',
    ERROR_DISPLAY_DURATION: 5000, // 5 seconds
    DECIMAL_PLACES: 2
};

/* ========================================
   DOM Element References
   ======================================== */

var DOM = {
    amount: document.getElementById('amount'),
    fromCurrency: document.getElementById('fromCurrency'),
    toCurrency: document.getElementById('toCurrency'),
    convertBtn: document.getElementById('convertBtn'),
    btnText: document.getElementById('btnText'),
    btnLoader: document.getElementById('btnLoader'),
    errorMessage: document.getElementById('errorMessage'),
    resultAmount: document.getElementById('resultAmount'),
    exchangeRate: document.getElementById('exchangeRate')
};

/* ========================================
   Application State
   ======================================== */

var AppState = {
    currencies: {},
    isLoading: false,
    currentExchangeRate: null,
    errorTimeout: null
};

/* ========================================
   Initialization
   ======================================== */

/**
 * Initialize the application when DOM is ready
 */
function initializeApp() {
    loadAvailableCurrencies()
        .then(function () {
            setupEventListeners();
            setDefaultCurrencies();
            DOM.amount.focus();
        })
        .catch(function (error) {
            displayError('Failed to initialize application. Please refresh the page.');
            console.error('Initialization error:', error);
        });
}

/* ========================================
   API Functions
   ======================================== */

/**
 * Fetch list of available currencies from API
 * @returns {Promise} Resolves when currencies are loaded
 */
function loadAvailableCurrencies() {
    return new Promise(function (resolve, reject) {
        setLoadingState(true);

        var url = CONFIG.API_BASE_URL + '/' + CONFIG.API_KEY + '/latest/USD';

        fetch(url)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('HTTP error! Status: ' + response.status);
                }
                return response.json();
            })
            .then(function (data) {
                if (data.result !== 'success') {
                    throw new Error(data['error-type'] || 'API request failed');
                }

                AppState.currencies = data.conversion_rates;
                populateCurrencyDropdowns();
                setLoadingState(false);
                resolve();
            })
            .catch(function (error) {
                displayError('Unable to load currencies. Please check your internet connection and API key.');
                console.error('Currency loading error:', error);
                setLoadingState(false);
                reject(error);
            });
    });
}

/**
 * Fetch exchange rate between two currencies
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {Promise<number>} Exchange rate
 */
function fetchExchangeRate(fromCurrency, toCurrency) {
    return new Promise(function (resolve, reject) {
        var url = CONFIG.API_BASE_URL + '/' + CONFIG.API_KEY + '/latest/' + fromCurrency;

        fetch(url)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('HTTP error! Status: ' + response.status);
                }
                return response.json();
            })
            .then(function (data) {
                if (data.result !== 'success') {
                    throw new Error(data['error-type'] || 'Failed to fetch exchange rate');
                }
                resolve(data.conversion_rates[toCurrency]);
            })
            .catch(function (error) {
                reject(error);
            });
    });
}

/* ========================================
   UI Population Functions
   ======================================== */

/**
 * Populate both currency dropdowns with available currencies
 */
function populateCurrencyDropdowns() {
    var currencyCodes = Object.keys(AppState.currencies).sort();

    // Clear existing options except placeholder
    DOM.fromCurrency.innerHTML = '<option value="" selected disabled>Source Currency</option>';
    DOM.toCurrency.innerHTML = '<option value="" selected disabled>Target Currency</option>';

    // Add currency options to both dropdowns
    for (var i = 0; i < currencyCodes.length; i++) {
        var code = currencyCodes[i];
        var option1 = createCurrencyOption(code);
        var option2 = createCurrencyOption(code);

        DOM.fromCurrency.appendChild(option1);
        DOM.toCurrency.appendChild(option2);
    }
}

/**
 * Create a currency option element
 * @param {string} currencyCode - Currency code (e.g., 'USD')
 * @returns {HTMLOptionElement}
 */
function createCurrencyOption(currencyCode) {
    var option = document.createElement('option');
    option.value = currencyCode;
    option.textContent = currencyCode;
    return option;
}

/**
 * Set default currency selections
 */
function setDefaultCurrencies() {
    if (AppState.currencies[CONFIG.DEFAULT_FROM_CURRENCY]) {
        DOM.fromCurrency.value = CONFIG.DEFAULT_FROM_CURRENCY;
    }
    if (AppState.currencies[CONFIG.DEFAULT_TO_CURRENCY]) {
        DOM.toCurrency.value = CONFIG.DEFAULT_TO_CURRENCY;
    }
}

/* ========================================
   Event Handlers
   ======================================== */

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Convert button click
    DOM.convertBtn.addEventListener('click', handleConversionRequest);

    // Amount input validation
    DOM.amount.addEventListener('input', handleAmountInput);

    // Enter key to convert
    DOM.amount.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            handleConversionRequest();
        }
    });

    // Currency change resets results
    DOM.fromCurrency.addEventListener('change', resetResults);
    DOM.toCurrency.addEventListener('change', resetResults);
}

/**
 * Handle amount input - allow only valid decimal numbers
 * @param {Event} event - Input event
 */
function handleAmountInput(event) {
    var value = event.target.value;

    // Remove any non-numeric characters except decimal point
    value = value.replace(/[^0-9.]/g, '');

    // Allow only one decimal point
    var parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }

    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > CONFIG.DECIMAL_PLACES) {
        value = parts[0] + '.' + parts[1].substring(0, CONFIG.DECIMAL_PLACES);
    }

    event.target.value = value;
    hideError();
}

/**
 * Main conversion request handler
 */
function handleConversionRequest() {
    hideError();

    // Validate all inputs
    if (!validateInputs()) {
        return;
    }

    var amount = parseFloat(DOM.amount.value);
    var fromCurrency = DOM.fromCurrency.value;
    var toCurrency = DOM.toCurrency.value;

    setLoadingState(true);

    fetchExchangeRate(fromCurrency, toCurrency)
        .then(function (rate) {
            var convertedAmount = (amount * rate).toFixed(CONFIG.DECIMAL_PLACES);
            displayConversionResults(convertedAmount, rate, fromCurrency, toCurrency);
            setLoadingState(false);
        })
        .catch(function (error) {
            displayError('Conversion failed. Please try again.');
            console.error('Conversion error:', error);
            setLoadingState(false);
        });
}

/* ========================================
   Validation Functions
   ======================================== */

/**
 * Validate all user inputs
 * @returns {boolean} True if all inputs are valid
 */
function validateInputs() {
    var amount = DOM.amount.value.trim();
    var fromCurrency = DOM.fromCurrency.value;
    var toCurrency = DOM.toCurrency.value;

    // Check if amount is entered
    if (!amount) {
        displayError('Please enter an amount to convert');
        DOM.amount.focus();
        return false;
    }

    // Check if amount is a valid positive number
    var numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        displayError('Please enter a valid amount greater than 0');
        DOM.amount.focus();
        return false;
    }

    // Check if source currency is selected
    if (!fromCurrency) {
        displayError('Please select a source currency');
        DOM.fromCurrency.focus();
        return false;
    }

    // Check if target currency is selected
    if (!toCurrency) {
        displayError('Please select a target currency');
        DOM.toCurrency.focus();
        return false;
    }

    // Check if currencies are different
    if (fromCurrency === toCurrency) {
        displayError('Source and target currencies must be different');
        DOM.toCurrency.focus();
        return false;
    }

    return true;
}

/* ========================================
   Display Functions
   ======================================== */

/**
 * Display conversion results
 * @param {string} convertedAmount - Formatted converted amount
 * @param {number} rate - Exchange rate used
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 */
function displayConversionResults(convertedAmount, rate, fromCurrency, toCurrency) {
    // Format the converted amount with proper number formatting
    var formattedAmount = parseFloat(convertedAmount).toLocaleString('en-US', {
        minimumFractionDigits: CONFIG.DECIMAL_PLACES,
        maximumFractionDigits: CONFIG.DECIMAL_PLACES
    });

    DOM.resultAmount.textContent = formattedAmount;

    // Format exchange rate to 4 decimal places
    var formattedRate = rate.toFixed(4);
    DOM.exchangeRate.textContent = 'Exchange Rate: 1 ' + fromCurrency + ' = ' + formattedRate + ' ' + toCurrency;

    AppState.currentExchangeRate = rate;

    // Add subtle animation to result
    DOM.resultAmount.style.animation = 'none';
    setTimeout(function () {
        DOM.resultAmount.style.animation = 'slideDown 0.3s ease';
    }, 10);
}

/**
 * Reset results to initial state
 */
function resetResults() {
    DOM.resultAmount.textContent = '--';
    DOM.exchangeRate.textContent = 'Exchange Rate: 1 [SOURCE] = [RATE] [TARGET]';
    AppState.currentExchangeRate = null;
    hideError();
}

/**
 * Set loading state for UI elements
 * @param {boolean} isLoading - Loading state
 */
function setLoadingState(isLoading) {
    AppState.isLoading = isLoading;

    // Disable/enable controls
    DOM.convertBtn.disabled = isLoading;
    DOM.amount.disabled = isLoading;
    DOM.fromCurrency.disabled = isLoading;
    DOM.toCurrency.disabled = isLoading;

    // Update button appearance
    if (isLoading) {
        DOM.btnText.textContent = 'Converting...';
        DOM.btnLoader.classList.remove('d-none');
    } else {
        DOM.btnText.textContent = 'Convert';
        DOM.btnLoader.classList.add('d-none');
    }
}

/**
 * Display error message
 * @param {string} message - Error message to display
 */
function displayError(message) {
    DOM.errorMessage.textContent = message;
    DOM.errorMessage.classList.remove('d-none');

    // Clear any existing timeout
    if (AppState.errorTimeout) {
        clearTimeout(AppState.errorTimeout);
    }

    // Auto-hide error after specified duration
    AppState.errorTimeout = setTimeout(function () {
        hideError();
    }, CONFIG.ERROR_DISPLAY_DURATION);
}

/**
 * Hide error message
 */
function hideError() {
    DOM.errorMessage.classList.add('d-none');
    if (AppState.errorTimeout) {
        clearTimeout(AppState.errorTimeout);
        AppState.errorTimeout = null;
    }
}

/* ========================================
   Error Handling
   ======================================== */

/**
 * Global error handler for uncaught errors
 */
window.addEventListener('error', function (event) {
    console.error('Uncaught error:', event.error);
    displayError('An unexpected error occurred. Please refresh the page.');
});

/**
 * Global handler for unhandled promise rejections
 */
window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled promise rejection:', event.reason);
    displayError('An unexpected error occurred. Please try again.');
});

/* ========================================
   Application Start
   ======================================== */

/**
 * Start the application when DOM is ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}