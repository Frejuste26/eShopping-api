const listProductsBtn = document.getElementById('listProductsBtn');
            const listProductsResponse = document.getElementById('listProductsResponse');
            const createProductBtn = document.getElementById('createProductBtn');
            const createProductResponse = document.getElementById('createProductResponse');

            const productNameInput = document.getElementById('productName');
            const productPriceInput = document.getElementById('productPrice');
            const productDescriptionInput = document.getElementById('productDescription');

            async function handleRequest(url, method, body, responseElement) {
                try {
                    const options = {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    };
                    if (body) {
                        options.body = JSON.stringify(body);
                    }
                    const response = await fetch(url, options);
                    const data = await response.json();
                    responseElement.querySelector('pre').textContent = JSON.stringify(data, null, 2);
                    responseElement.classList.remove('hidden');
                } catch (error) {
                    responseElement.querySelector('pre').textContent = `Erreur: ${error.message}`;
                    responseElement.classList.remove('hidden');
                }
            }

            listProductsBtn.addEventListener('click', () => {
                handleRequest('/api/v1/products', 'GET', null, listProductsResponse);
            });

            createProductBtn.addEventListener('click', () => {
                const productData = {
                    name: productNameInput.value,
                    price: parseFloat(productPriceInput.value),
                    description: productDescriptionInput.value
                    // Ajoutez d'autres champs si nécessaire pour votre API
                };
                handleRequest('/api/v1/products', 'POST', productData, createProductResponse);
            });